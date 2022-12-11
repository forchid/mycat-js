const TypeHelper = require("../util/type-helper");
const Connection = require("../net/connection");
const Handler = require("../handler");
const MycatServer = require("../mycat-server");
const HandshakeV10Packet = require("../net/mysql/handshake-v10-packet");
const Capabilities = require("../config/capabilities");
const HandshakePacket = require("../net/mysql/handshake-packet");
const ErrorPacket = require("../net/mysql/error-packet");
const NetError = require("../net/net-error");
const CompressHelper = require("../util/compress-helper");
const Logger = require("../util/logger");
const BufferHelper = require("../buffer/buffer-helper");
const ErrorCode = require("../net/mysql/error-code");
const OkPacket = require("../net/mysql/ok-packet");
const UnsupportedError = require("../lang/unsupported-error");

const net = require('net');
const crypto = require('crypto');

class FrontConnection extends Connection {

    #socket = null;
    #handler = null;
    #authTimeout = 0;
    #traceProtocol = 0;

    #privileges = null;
    #capabilities = 0;
    #seed = null;
    #authenticated = false;
    #user = '';
    
    #loadDataStarted = false;
    #userVars = new Map();
    // Route node name -> backend connection
    #backends = new Map();

    constructor (id, socket, handler) {
        super(id);
        TypeHelper.ensureInstanceof(socket, net.Socket, 'socket');
        TypeHelper.ensureInstanceof(handler, Handler, 'handler');
        super.host = socket.remoteAddress;
        super.port = socket.remotePort;
        super.localPort = socket.localPort;
        this.#socket = socket;
        this.#handler = handler;
    }

    get sysVars() {
        throw new UnsupportedError("sysVars");
    }

    getSysVar(name) {
        name = name.toLowerCase();
        return this.sysVars.get(name);
    }

    get userVars() {
        return this.#userVars;
    }

    getUserVar(name) {
        name = name.toLowerCase();
        return this.userVars.get(name);
    }

    get loadDataStarted() {
        return this.#loadDataStarted;
    }

    set loadDataStarted(started) {
        this.#loadDataStarted = started;
    }

    get handler() {
        return this.#handler;
    }

    get user() {
        return this.#user;
    }

    set user(user) {
        this.#user = user;
    }

    get authenticated() {
        return this.#authenticated;
    }

    set authenticated(auth) {
        this.#authenticated = auth;
    }

    get seed() {
        return this.#seed;
    }

    set seed(seed) {
        this.#seed = seed;
    }

    get handler() {
        return this.#handler;
    }

    get socket() { return this.#socket; }

    get authTimeout() { return this.#authTimeout; }

    set authTimeout(timeout) {
        this.#authTimeout = timeout;
        if (timeout < 0) timeout = 0;
        this.socket.timeout = timeout;
    }

    get connManager() {
        return super.connManager;
    }

    set connManager(manager) {
        super.connManager = manager;
        if (manager !== null) {
            manager.addFrontend(this);
        }
    }

    get traceProtocol() { return this.#traceProtocol; }

    set traceProtocol(trace) { this.#traceProtocol = trace; }

    get capabilities() { return this.#capabilities; }

    set capabilities(cap) { this.#capabilities = cap; }

    get privileges() {
        return this.#privileges;
    }

    set privileges(privileges) {
        this.#privileges = privileges;
    }

    get idleTimeout() {
        return super.idleTimeout;
    }

    set idleTimeout(timeout) {
        super.idleTimeout = timeout;
        if (timeout <= 0) timeout = 0;
        this.socket.timeout = timeout;
    }

    getBackend(routeNode) {
        let name = routeNode.name;
        return this.#backends.get(name);
    }

    bindBackend(routeNode, backend) {
        let old = this.getBackend(routeNode);
        if (old && old != backend) {
            let e = `The backend connection exists for ${routeNode + ""}`;
            throw new Error(e);
        }
        this.#backends.set(routeNode.name, backend);
        backend.routeNode = routeNode;
    }

    unbindBackend(backend) {
        let routeNode = backend.routeNode;
        if (routeNode) {
            let name = routeNode.name;
            this.#backends.delete(name);
            backend.routeNode = null;
            backend.release();
            return true;
        } else {
            return false;
        }
    }

    /**
     * Start the connection handle.
     */
    start() {
        if (this.closed) return;
        this.#seed = initHandshake(this);
        this.handler.invoke(this);
    }

    /** Send an error packet to client.
     * 
     * @param seq Error packet sequence id
     * @param errno Error number
     * @param args The message format arguments, an array or multi-args
     * 
     * @returns The error packet
     */
    sendError(seq, errno) {
        let error = new ErrorPacket();
        error.sequenceId = seq;
        error.errno = errno;

        let mo;
        let args = arguments;
        if (args.length > 2) {
            let arg = args[2];
            if (arg && arg.constructor === Array) args = arg;
            else args = Array.prototype.slice.call(args, 2);
            mo = ErrorCode.messageOf(errno, args);
        } else {
            mo = ErrorCode.messageOf(errno);
        }
        if (mo) {
            error.message = mo.message;
            error.sqlState = mo.sqlState;
        }
        
        error.write(this);
        return error;
    }

    ping() {
        this.send(OkPacket.OK, "MySQL Ok packet");
    }

    send(buffer, start = 0, end = -1, msg) {
        if (start.constructor !== Number) {
            msg = start;
            start = 0;
        }
        return this.write(buffer, start, end, true, msg);
    }

    write(buffer, start = 0, end = -1, flush = false, msg = 'Packet') {
        const socket = this.socket;
        if (start === true) {
            flush = true;
            start = 0;
        }
        if (end === -1) {
            end = buffer.length;
        }

        let buf;
        if (start === 0 && end === buffer.length) {
            buf = buffer;
        } else {
            buf = buffer.slice(start, end);
        }
        if (this.supportCompress) {
            buf = CompressHelper.compressMysqlPacket(buf);
        }
        if (this.traceProtocol) {
            let hex = BufferHelper.dumpHex(buf);
            Logger.info('S -> F: write %s -\r\n%s', msg, hex);
        }
        try {
            socket.write(buf);
        } catch (e) {
            throw new NetError(`${this} write failed - ${e}`);
        }
        super.connManager.addOutBytes(buf.length);

        if (flush) {
            try {
                socket.flush();
            } catch (e) {
                throw new NetError(`${this} flush failed - ${e}`);
            }
        }
        
        return start;
    }

    flush() {
        try {
            this.socket.flush();
        } catch (e) {
            throw new NetError(`${this} flush failed - ${e}`);
        }
    }

    close(reason) {
        this.socket.close();
        return super.close(reason);
    }
    
}

function initHandshake(conn) {
    let mycat = MycatServer.instance;
    let system = mycat.system;
    let useHandshakeV10 = system.useHandshakeV10;
    const seed1 = asciiSeed(crypto.randomBytes(8));
    const seed2 = asciiSeed(crypto.randomBytes(12));
    const seed = Buffer.concat([seed1, seed2]);

    conn.capabilities = serverCapabilities(system);
    let hs;
    if (useHandshakeV10) hs = new HandshakeV10Packet();
    else hs = new HandshakePacket();
    hs.sequenceId = 0;
    hs.threadId = conn.id;
    hs.seed = seed1;
    hs.serverCapabilities = conn.capabilities;
    hs.serverCharsetIndex = conn.charsetIndex;
    hs.serverStatus = 2;
    hs.restOfScrambleBuff = seed2;
    hs.write(conn);

    return seed;
}

/** Now mysql-connector-j(.. v5.1.35+ .., v8.0.27 ..) had handled 
 * seed with `ASCII` charset string, so the seed should be modded 
 * by 0x80 and can't contain 0 char.
 * Note that mariadb connector-j, mysql client works with `latin1`.
 */
function asciiSeed(seed) {
    let r = 0;
    seed.forEach((b, i) => {
        b %= 0x80;
        while (!b) {
            if (r) {
                b = r;
                break;
            }
            r = crypto.randomBytes(1);
            b = r = r[0] % 0x80;
        }
        seed[i] = b;
    });
    return seed;
}

function serverCapabilities(system) {
    let flag = 0;
    flag |= Capabilities.CLIENT_LONG_PASSWORD;
    flag |= Capabilities.CLIENT_FOUND_ROWS;
    flag |= Capabilities.CLIENT_LONG_FLAG;
    flag |= Capabilities.CLIENT_CONNECT_WITH_DB;
    // flag |= Capabilities.CLIENT_NO_SCHEMA;
    let usingCompress = system.useCompression;
    if (usingCompress) {
        flag |= Capabilities.CLIENT_COMPRESS;
    }
    
    flag |= Capabilities.CLIENT_ODBC;
    flag |= Capabilities.CLIENT_LOCAL_FILES;
    flag |= Capabilities.CLIENT_IGNORE_SPACE;
    flag |= Capabilities.CLIENT_PROTOCOL_41;
    flag |= Capabilities.CLIENT_INTERACTIVE;
    // flag |= Capabilities.CLIENT_SSL;
    flag |= Capabilities.CLIENT_IGNORE_SIGPIPE;
    flag |= Capabilities.CLIENT_TRANSACTIONS;
    // flag |= ServerDefs.CLIENT_RESERVED;
    flag |= Capabilities.CLIENT_SECURE_CONNECTION;
    // flag |= Capabilities.CLIENT_MULTI_STATEMENTS;
    flag |= Capabilities.CLIENT_MULTI_RESULTS;
    let useHandshakeV10 = system.useHandshakeV10;
    if(useHandshakeV10) {
        flag |= Capabilities.CLIENT_PLUGIN_AUTH;
    }

    return flag;
}

module.exports = FrontConnection;
