const BufferHelper = require("../../buffer/buffer-helper");
const Capabilities = require("../../config/capabilities");
const Handler = require("../../handler");
const MycatServer = require("../../mycat-server");
const Logger = require("../../util/logger");
const MysqlPassword = require("../../util/mysql-password");
const AuthPacket = require("../mysql/auth-packet");
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

        if (!this.#packet) {
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
                // TODO AuthSwitchPacket
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
        if (!privileges.userExists(user, host)) {
            failure(source, this.#seq + 1, ErrorCode.ER_ACCESS_DENIED_ERROR, 
                `Access denied for user \`${user}\`@${host}`);
            return;
        }

        let password = this.#packet.password;
        if (!passwordLess && !checkPassword(source, password, user)) {
            let wp = password && password.length > 0;
            failure(source, this.#seq + 1, ErrorCode.ER_ACCESS_DENIED_ERROR, 
                `Access denied for user \`${user}\`@${host} ${wp?'with':'without'} password`);
            return;
        }

        if (connsLimited(source, user)) {
            failure(source, this.#seq + 1, ErrorCode.ER_ACCESS_DENIED_ERROR, 
                `Access denied for user \`${user}\`@${host} because of connections limited`);
            return;
        }

        let schema = this.#packet.database;
        if (checkSchema(source, schema, user, (errno, message) => {
            failure(source, this.#seq + 1, errno, message);
        })) {
            success(source, this.#packet, this.#authOk);
        }
    }

}

function success(source, packet, authOk) {
    let user = packet.user;
    source.authenticated = true;
    source.user = user;
    source.schema = packet.database;
    source.charsetIndex = packet.charsetIndex;
    
    let clientCompress = packet.clientFlags & Capabilities.CLIENT_COMPRESS;
    let serverCompress = MycatServer.instance.config.system.useCompression;
    source.supportCompress = clientCompress && serverCompress;
    Logger.debug('%s: the user `%s`@%s login success.', source, user, source.host);

    if (source.traceProtocol) {
        let hex = BufferHelper.dumpHex(authOk);
        Logger.info('S -> F: write MySQL Ok Packet -\r\n%s', hex);
    }
    source.send(authOk);
}

function failure(source, seq, errno, message) {
    Logger.warn('%s: %s', source, message);
    source.sendError(seq, errno, message);
    source.close(message);
}

function checkSchema(source, schema, user, errCb) {
    if (schema === '') {
        // Connect without DB
        return true;
    }

    let privileges = source.privileges;
    if (privileges.schemaExists(schema)) {
        let schemas = privileges.getUserSchemas(user);
        if (schemas.has(schema)) {
            return true;
        } else {
            let m = `Access denied for user \`${user}\` to database '${schema}'`;
            errCb(ErrorCode.ER_DBACCESS_DENIED_ERRORR, m);
            return false;
        }
    } else {
        errCb(ErrorCode.ER_BAD_DB_ERROR, `Unknown database '${schema}'`);
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
