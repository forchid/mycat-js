const BufferHelper = require("../../buffer/buffer-helper");

/**
 * Mysql packet codec.
 */
class MysqlMessage {

    static #EMPTY_BYTES = Buffer.alloc(0);

    static get NULL_LENGTH() { return -1; }

    #data = null;
    #length = 0;
    #position = 0;

    constructor (buffer, length = -1) {
        this.#data = buffer;
        if (length === -1) length = buffer.length;
        this.#length = length;
    }

    get data() { return this.#data; }

    get length() { return this.#length; }

    get position() { return this.#position; }

    get hasRemaining() { return this.position < this.length; }

    skip(i = 1) { this.#position += i; }

    skipTo(i) { this.#position = i; }

    read() { return this.data[this.#position++]; }

    readUInt8() {
        let p = this.position;
        let i = this.data.readUInt8(p);
        this.#position = p + 1;
        return i;
    }

    readUInt16() {
        let p = this.position;
        let i = this.data.readUInt16LE(p);
        this.#position = p + 2;
        return i;
    }

    readUInt24() {
        let p = this.position;
        let b = this.data;
        let i = BufferHelper.readUInt24LE(b, p);
        this.#position = p + 3;
        return i;
    }

    readUInt32() {
        let p = this.position;
        let i = this.data.readUInt32LE(p); // BigInt!
        this.#position = p + 4;
        return Number(i);
    }

    readInt32() {
        let p = this.position;
        let i = this.data.readInt32LE(p);
        this.#position = p + 4;
        return i;
    }

    readFloat() {
        let p = this.position;
        let i = this.data.readFloatLE(p);
        this.#position = p + 4;
        return i;
    }

    readInt64() {
        let p = this.position;
        let i = this.data.readIn64LE(p);
        this.#position = p + 8;
        return i;
    }

    readDouble() {
        let p = this.position;
        let i = this.data.readDoubleLE(p);
        this.#position = p + 8;
        return i;
    }

    readLength() {
        let b = this.data;
        let p = this.position;
        let len = b.readUInt8(p++);

        switch (len) {
            case 251:
                len = MysqlMessage.NULL_LENGTH;
                this.#position = p;
                break;
            case 252:
                len = b.readUInt16LE(p);
                this.#position = p + 2;
                break;
            case 253:
                len = b[p] & 0xff;
                len |= (b[p + 1] & 0xff) << 8;
                len |= (b[p + 2] & 0xff) << 16;
                this.#position = p + 3;
                break;
            case 254:
                len = b.readInt64LE(p);
                this.#position = p + 8;
                break;
            default:
                this.#position = p;
                break;
        }

        return len;
    }

    readBytes(size = -1) {
        if (size < 0) {
            if (this.hasRemaining) {
                let e = this.length;
                let p = this.position;
                let n = e - p;
                let r = Buffer.allocUnsafe(n);
                this.data.copy(r, 0, p, e);
                this.#position = e;
                return r;
            } else {
                return MysqlMessage.#EMPTY_BYTES;
            }
        } else {
            let p = this.position;
            let r = Buffer.allocUnsafe(size);
            this.data.copy(r, 0, p, p + size);
            this.#position = p + size;
            return r;
        } 
    }

    readBytesWithNull() {
        if (this.hasRemaining) {
            let offset = -1;
            let p = this.position;
            let n = this.length;
            let b = this.data;

            for (let i = p; i < n; ++i) {
                if (b[i] === 0) {
                    offset = i;
                    break;
                }
            }
            
            if (offset === -1) {
                return this.readBytes(n - p);
            } else if (offset === p) {
                this.#position++;
                return MysqlMessage.#EMPTY_BYTES;
            } else {
                let size = offset - p; // not include 0 value
                let r = Buffer.allocUnsafe(size);
                b.copy(r, 0, p, offset);
                this.#position = offset + 1/* skip 0 value */;
                return r;
            }
        } else {
            return MysqlMessage.#EMPTY_BYTES;
        }
    }

    getRowLength(fieldCount) {
        let size = 0;
        let bp = this.position;

        try {
            this.#position += 4;
            for (let i = 0; i < fieldCount; ++i) {
                let len = this.readLength();
                if (len <= 0) continue;
                this.#position += len;
                size += len;
            }
            return size;
        } finally {
            this.#position = bp;
        }
    }

    readBytesWithLength() {
        let len = this.readLength();

        if (len === MysqlMessage.NULL_LENGTH) {
            return null;
        } else if (len <= 0) {
            return MysqlMessage.#EMPTY_BYTES;
        } else {
            return this.readBytes(len);
        }
    }

    readString(charset = 'utf8') {
        let buf = this.readBytes();
        if (buf === MysqlMessage.#EMPTY_BYTES) {
            return null;
        } else {
            return buf.toString(charset);
        }
    }

    readStringWithNull(charset = 'utf8') {
        let buf = this.readBytesWithNull();
        if (buf === MysqlMessage.#EMPTY_BYTES) {
            return null;
        } else {
            return buf.toString(charset);
        }
    }

    readStringWithLength(charset = 'utf8') {
        let buf = this.readBytesWithLength();
        if (!buf || buf === MysqlMessage.#EMPTY_BYTES) {
            return null;
        } else {
            return buf.toString(charset);
        }
    }

    readTime() {
        this.skip(6);
        let hour = this.read();
        let minute = this.read();
        let second = this.read();
        return new Date(0, 0, 0, hour, minute, second);
    }

    readDate() {
        let length = this.read();
        let year = this.readUInt16();
        let month = this.read();
        let date = this.read();
        let hour = this.read();
        let minute = this.read();
        let second = this.read();

        if (length == 11) {
            let nanos = this.readUInt32();
            let millis = Math.floor(nanos / 1000000); // only support ms
            return new Date(year, --month, date, hour, minute, second, millis);
        } else {
            return new Date(year, --month, date, hour, minute, second);
        }
    }

    static writeLengthEncodedInt(buffer, n, p = 0) {
        let len = this.lengthEncodedOf(n);

        if (n.constructor === Buffer) {
            n = n.length;
        }
        switch (len) {
            case 1:
                buffer.writeUInt8(n, p);
                break;
            case 3:
                buffer.writeUInt8(0xfc, p++);
                buffer.writeUInt16(n, p);
                break;
            case 4:
                buffer.writeUInt8(0xfd, p++);
                BufferHelper.writeUInt24LE(buffer, n, p);
                break;
            case 9:
                buffer.writeUInt8(0xfe, p++);
                buffer.writeInt64(n, p);
                break;
            default:
                throw new Error(`Unknown length-encoded ${len}`);
        }

        return len;
    }

    static lengthEncodedOf(n) {
        let c = n.constructor;
        if (c === Number) {
            if(n < 0){
                return 9;
            } else if (n < 0xfb) {
                return 1;
            } else if (n < 0x10000) {
                return 3;
            } else if (n < 0x1000000) {
                return 4;
            } else {
                return 9;
            }
        } else if (c === Buffer) {
            return this.lengthEncodedOf(n.length);
        } else {
            throw new TypeError("The arg n type unsupported");
        }
    }

    static writeBytesWithLength(out, inp, p) {
        p += this.writeLengthEncodedInt(out, inp, p);
        p += out.set(inp, p);
        return p;
    }

}

module.exports = MysqlMessage;
