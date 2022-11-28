const BufferPool = require('../buffer/buffer-pool');
const TypeHelper = require('../util/type-helper');
const FrontConnection = require('./front-connection');
const BackConnection = require('./back-connection');
const CommandCounter = require('../statistic/command-counter');

/** The frontend/backend connection manager that checks connection whether idle,
 * sql execution timeout, manage buffer resources, also gathers statistics of SQL 
 * command, network input/output bytes etc.
 * 
 * @author little-pan
 * @since 2022-11-21
 */
class ConnManager {

    #name = '';
    #bufferPool = null;
    #frontends = new Map();
    #backends = new Map();

    #inBytes = 0;
	#outBytes = 0;
    #cmdCounter = new CommandCounter();

    constructor (bufferPool, name = 'ConnManager') {
        TypeHelper.ensureInstanceof(bufferPool, BufferPool, 'bufferPool');
        this.#bufferPool = bufferPool;
        this.#name = name;
    }

    get cmdCounter() {
        return this.#cmdCounter;
    }

    get name() {
        return this.#name;
    }

    get bufferPool() {
        return this.#bufferPool;
    }

    /** A map: id -> FrontConnection. */
    get frontends() {
        return this.#frontends;
    }

    /** A map: id -> BackConnection. */
    get backends() {
        return this.#backends;
    }

    get inBytes() {
        return this.#inBytes;
    }

    addInBytes(n) {
        this.#inBytes += n;
        return this;
    }

    get outBytes() {
        return this.#outBytes;
    }

    addOutBytes(n) {
        this.#outBytes += n;
        return this;
    }


    addFrontend(conn) {
        TypeHelper.ensureInstanceof(conn, FrontConnection, 'conn');
        this.frontends.set(conn.id, conn);
    }

    addBackend(conn) {
        TypeHelper.ensureInstanceof(conn, BackConnection, 'conn');
        this.backends.set(conn.id, conn);
    }

    removeConnection(conn) {
        if (conn instanceof FrontConnection) {
            this.frontends.delete(conn.id);
        } else if (conn instanceof BackConnection) {
            this.backends.delete(conn.id);
        } else {
            throw new Error(`Unknown connection type: ${conn}`);
        }
    }

    allocateBuffer(size, unsafe = true, await = false) {
        return this.bufferPool.allocate(size, unsafe, await);
    }

    resizeBuffer(buffer, size, await = false) {
        return this.bufferPool.resize(buffer, size, await);
    }

    releaseBuffer(buffer) {
        return this.bufferPool.release(buffer);
    }

}

module.exports = ConnManager;
