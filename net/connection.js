const CharsetHelper = require("../util/charset-helper");
const Logger = require("../util/logger");
const TypeHelper = require("../util/type-helper");
const iconv = require('iconv');

/**
 * The base network connection, includes frontend or backend 
 * connection.
 */
class Connection {

    #id = 0;
    #closed = false;
    #startupTime = new Date().getTime();
    #lastReadTime = this.#startupTime;
    #lastWriteTime = this.#startupTime;

    #host = ''; // remote host
    #port = 0;  // remote port
    #localPort = 0;
    #maxPacketSize = 0;
    #packetHeaderSize = 0;
    #charset = ''; // Init in frontend factory
    #charsetIndex = 0;
    #idleTimeout = 0;

    #connManager = null;
    #writeBuffer = null;
    #supportCompress = false;

    constructor (id) {
        TypeHelper.ensureInteger(id, 'connection id');
        this.#id = id;
    }

    get id() { return this.#id; }

    get closed() { return this.#closed; }

    get startupTime() { return this.#startupTime; }

    get lastReadTime() { return this.#lastReadTime; }

    get lastWriteTime() { return this.#lastWriteTime; }

    get idleTimeout() { return this.#idleTimeout; }

    set idleTimeout(timeout) { this.#idleTimeout = timeout; }

    get host() { return this.#host; }

    set host(host) { this.#host = host; }

    get port() { return this.#port; }

    set port(port) { this.#port = port; }

    get localPort() { return this.#localPort; }

    set localPort(localPort) { this.#localPort = localPort; }

    get writeBuffer() { return this.#writeBuffer; }

    get supportCompress() { return this.#supportCompress; }

    set supportCompress(support) { this.#supportCompress = support; }

    get maxPacketSize() { return this.#maxPacketSize; }

    set maxPacketSize(size) { this.#maxPacketSize = size; }

    get packetHeaderSize() { return this.#packetHeaderSize; }

    set packetHeaderSize(size) { this.#packetHeaderSize = size; }

    get charset() { return this.#charset; }

    set charset(charset) {
        let cs = charset.replace(/'/g, ''); // eg. 'utf8' -> utf8
        let ci = CharsetHelper.index(cs);
        if (ci > 0) {
            if (cs === 'utf8mb4') cs = 'utf8';
            this.#charset = cs;
            this.#charsetIndex = ci;
        } else {
            throw new Error(`charset '${charset}' not found!`);
        }
    }

    get charsetIndex() { return this.#charsetIndex; }

    set charsetIndex(index) {
        let charset = CharsetHelper.charset(index);
        if (!charset) {
            throw new Error(`Unknown charset index ${index}`);
        }
        if (!iconv.isEncoding(charset)) {
            throw new Error(`Charset ${charset} not supported`);
        }
        this.#charset = charset;
        this.#charsetIndex = index;
    }

    get idle() {
        let cur = new Date().getTime();
        let lst = Math.max(this.lastReadTime, this.lastWriteTime);
        return (cur > lst + this.idleTimeout);
    }

    idleCheck() {
        if (this.idle) {
            console.info('%s idle timeout and will be closed', this);
            this.close('idle timeout');
        }
    }

    get connManager() { return this.#connManager; }

    set connManager(manager) {
        if (!this.connManager) {
            this.#connManager = manager;
            this.#writeBuffer = this.allocate();
        }
    }

    allocate() {
        return this.#connManager.allocateBuffer();
    }

    ensureSize(buffer, size) {
        if (buffer.length < size) {
            this.connManager.resizeBuffer(buffer, size);
        }
    }

    close(reason) {
        let cm = this.connManager;
        if (cm) {
            cm.releaseBuffer(this.writeBuffer);
            this.#writeBuffer = null;
            cm.removeConnection(this);
        }
        if (reason) {
            let s = `Close connection '${this}' by reason '${reason}'`;
            Logger.info(s);
        }
        this.#closed = true;
    }

    toString() {
        let name = this.constructor.name;
        return `${name}#${this.id}`;
    }

}

module.exports = Connection;
