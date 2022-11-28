const Capabilities = require("../../config/capabilities");
const Handler = require("../../handler");
const MycatServer = require("../../mycat-server");
const Logger = require("../../util/logger");
const MysqlPassword = require("../../util/mysql-password");
const AuthPacket = require("../mysql/auth-packet");
const AuthSwitchPacket = require("../mysql/auth-switch-packet");
const ErrorCode = require("../mysql/error-code");
const HandshakeV10Packet = require("../mysql/handshake-v10-packet");
const MysqlPacket = require("../mysql/mysql-packet");
const QuitPacket = require("../mysql/quit-packet");

class FrontAuthHandler extends Handler {

    #authOk = Buffer.from([7, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0]);

    #packet = null;
    #seq = 0;

    invoke(packet) {
        let source = packet.source;
        if (source.authenticated) {
            return packet;
        }

        let length = packet.length;
        let buffer = packet.buffer;
        if (length === QuitPacket.QUIT.length && 
            buffer[4] === MysqlPacket.COM_QUIT) {
            source.close('quit packet');
            return;
        }

        if (this.#packet) {
            let authSwitch = new AuthSwitchPacket();
            authSwitch.read(buffer.slice(0, length));
            this.#packet.password = authSwitch.authData;
            this.#seq = authSwitch.sequenceId + 1;
        } else {
            let ap = new AuthPacket();
            let res = ap.read(buffer, source, length);
            if (!res.ok) {
                source.close(res.msg);
                return;
            }
            this.#packet = ap;
            this.#seq = ap.sequenceId;
            
            let plugin = ap.clientAuthPlugin;
            let def = HandshakeV10Packet.DEFAULT_AUTH_PLUGIN_NAME;
            if (plugin && def.compare(plugin) !== 0) {
                let authSwitch = new AuthSwitchPacket(def, source.seed);
                authSwitch.sequenceId = this.#seq + 1;
                authSwitch.write(source.writeBuffer, source);
                return;
            }
        }

        let passwordLess = false;
        let mycat = MycatServer.instance;
        let system = mycat.system;
        if (system.nonePasswordLogin) {
            passwordLess = true;
            let config = mycat.config;
            let users = config.users;
            if (users.size) {
                setDefaultAccount(this.#packet, users);
            }
        }
        let privileges = source.privileges;
        let user = this.#packet.user;
        let host = source.host;
        let password = this.#packet.password;

        if ((!privileges.userExists(user, host)) || 
            (!passwordLess && !checkPassword(source, password, user))) {
            let er = ErrorCode.ER_ACCESS_DENIED_ERROR;
            let wp = usingPassword(password);
            failure(source, this.#seq + 1, er, user, host, wp);
            return;
        }

        if (connsLimited(source, user)) {
            failure(source, this.#seq + 1, ErrorCode.ER_CON_COUNT_ERROR);
            return;
        }

        let schema = this.#packet.database;
        if (checkSchema(source, schema, user, errno => {
            if (errno === ErrorCode.ER_BAD_DB_ERROR) {
                failure(source, this.#seq + 1, errno, schema);
            } else {
                failure(source, this.#seq + 1, errno, user, host, schema);
            }
        })) {
            let ok = this.#authOk;
            ok[3] = this.#seq + 1;
            success(source, this.#packet, ok);
            source.handler.remove(this);
        }
    }

}

function success(source, packet, authOk) {
    let user = packet.user;
    source.authenticated = true;
    source.seed = null;
    source.user = user;
    source.schema = packet.database;
    source.charsetIndex = packet.charsetIndex;

    let system = MycatServer.instance.system;
    source.idleTimeout = system.idleTimeout;
    
    let clientCompress = !!(packet.clientFlags & Capabilities.CLIENT_COMPRESS);
    let serverCompress = !!system.useCompression;
    source.supportCompress = clientCompress && serverCompress;
    Logger.debug(`%s: the user '%s'@'%s' login success(client compress %s and server %s).`, 
        source, user, source.host, clientCompress, serverCompress);
    
    source.send(authOk, 'MySQL Ok Packet');
}

function usingPassword(password) {
    return (password && password.length > 0? "YES": "NO");
}

function failure(source, seq, errno) {
    let args = arguments;
    let packet;
    if (args.length > 3) {
        args = Array.prototype.slice.call(args, 3);
        packet = source.sendError(seq, errno, args);
    } else {
        packet = source.sendError(seq, errno);
    }
    source.close(packet.message);
}

function checkSchema(source, schema, user, errCb) {
    if (schema === '') {
        // Connect without DB
        return true;
    }

    let privileges = source.privileges;
    schema = schema.toUpperCase();
    if (privileges.schemaExists(schema)) {
        let schemas = privileges.getUserSchemas(user);
        if (schemas.has(schema)) {
            return true;
        } else {
            errCb(ErrorCode.ER_DBACCESS_DENIED_ERRORR);
            return false;
        }
    } else {
        errCb(ErrorCode.ER_BAD_DB_ERROR);
        return false;
    }
}

function connsLimited(source, user) {
    let privileges = source.privileges;
    let benchmark = privileges.getBenchmark(user);

    if (benchmark > 0) {
        let cm = source.connManager;
        return (cm.frontends.size >= benchmark);
    } else {
        return false;
    }
}

function checkPassword(source, password, user) {
    let privileges = source.privileges;
    let pass = privileges.getPassword(user);
    
    if (pass === '') {
        return !password;
    }
    if (!password) {
        return false;
    }

    let seed = source.seed;
    let scramBytes = MysqlPassword.scramble411(pass, seed);
    return (password.compare(scramBytes) === 0);
}

function setDefaultAccount(authPacket, users) {
    for (let conf of users.values()) {
        if (conf.defaultAccount) {
            authPacket.user = conf.name;
        }
    }
}

module.exports = FrontAuthHandler;
