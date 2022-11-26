const TypeHelper = require('../util/type-helper');
const FrontConnFactory = require('./factory/front-conn-factory');
const Logger = require('../util/logger');
const CoHelper = require('../util/co-helper');
const MycatServer = require('../mycat-server');

const net = require('net');
const co = require('coroutine');

/**
 * A network server based on socket and coroutine.
 * 
 * @author little-pan
 * @since 2022-11-21
 */
class NetServer {

    #name = '';
    #port = 0;
    #started = false;
    #stopped = false;

    #helper = null;

    constructor(name = 'NetServer', addr = '0.0.0.0', port = 0, 
        backlog = 250, connFactory, family = net.AF_INET) {
        TypeHelper.ensureInstanceof(connFactory, FrontConnFactory, 'connFactory');
        this.#name = name;

        let failed = true;
        const socket = new net.Socket(family);
        try {
            socket.bind(addr, port);
            socket.listen(backlog);
            this.#port = socket.localPort;
            this.#helper = new ServerHelper(this, socket, connFactory);
            failed = false;
        } finally {
            if (failed) {
                socket.close();
            }
        }
    }

    get name() {
        return this.#name;
    }

    get acceptCount() {
        return this.#helper.acceptCount;
    }

    get port() {
        return this.#port;
    }

    get started() {
        return this.#started;
    }

    get stopped() {
        return this.#stopped;
    }

    start() {
        if (this.started) {
            throw new Error(`The server '${this.name}' has started!`);
        }
        co.start(() => this.#helper.run());
        this.#started = true;
    }

    stop() {
        this.#helper.stop();
        this.#stopped = true;
    }
}

class ServerHelper {

    #server = null;
    #socket = null;
    #connFactory = null;
    #acceptCount = 0;

    constructor (server, socket, connFactory) {
        this.#server = server;
        this.#socket = socket;
        this.#connFactory = connFactory;
    }

    get acceptCount() {
        return this.#acceptCount;
    }

    run() {
        const server = this.#server;
        const socket = this.#socket;
        try {
            CoHelper.name = server.name;
            let addr = socket.localAddress;
            let loc = `${addr}:${server.port}`;
            Logger.info(`${server.name} listens on ${loc}, ready for connection.`);
            for (;;) {
                const conn = socket.accept();
                this.#acceptCount++;
                this.handle(conn);
            }
        } catch (e) {
            if (!this.#server.stopped) {
                MycatServer.uncaught(e);
            }
        } finally {
            socket.close();
        }
    }

    handle(sock) {
        try {
            let factory = this.#connFactory;
            co.start(() => {
                let conn;
                try {
                    conn = factory.make(sock);
                    conn.start();
                } catch (e) {
                    if (conn) conn.close();
                    MycatServer.uncaught(e);
                } finally {
                    sock.close();
                }
            });
        } catch (e) {
            sock.close();
            MycatServer.uncaught(e);
        }
    }

    stop() {
        this.#socket.close();
    }
}

module.exports = NetServer;
