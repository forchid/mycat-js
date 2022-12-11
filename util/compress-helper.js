const UnsupportedError = require("../lang/unsupported-error");
const MysqlMessage = require("../net/mysql/mysql-message");
const BufferHelper = require("../buffer/buffer-helper");

const zlib = require('zlib');

class CompressHelper {

    static #MIN_COMPRESS_LENGTH = 1536; // TCP-IP single packet

    constructor () {
        throw new UnsupportedError('CompressHelper()');
    }

    static decompressMysqlPacket(buffer, length = -1) {
        let m = new MysqlMessage(buffer, length);
        let payloadLen = m.readUInt24();
        m.skip();
        let uncLen = m.readUInt24();

        if (uncLen === 0) {
            let r = Buffer.allocUnsafe(payloadLen);
            buffer.copy(r, 0, 7);
            return [r];
        } else {
            let bundle = this.decompress(buffer, 7, payloadLen);
            return splitPackets(bundle);
        }
    }

    /** Compress one packet or several packets into a buffer.
     * 
     * @param buffer A buffer, or buffer array
     * @param length Buffer length, or buffer array length
     * @param minCompLen Min compress length, default 1536
     * 
     * @returns The compressed buffer
     */
    static compressMysqlPacket(buffer, length = -1, 
            minCompLen = CompressHelper.#MIN_COMPRESS_LENGTH) {
        if (buffer instanceof Array) {
            if (length !== -1) 
                buffer = buffer.slice(0, length);
            buffer = Buffer.concat(buffer);
            length = buffer.length;
        } else if (length === -1) {
            length = buffer.length;
        }

        if (length < minCompLen) {
            let n = 7 + length;
            let r = Buffer.allocUnsafe(n);
            buffer.copy(r, 0, 0, 4); // copy head
            BufferHelper.writeUInt24LE(r, length);
            r.fill(0, 4, 7); // fill un-comp length
            buffer.copy(r, 7, 0); // copy packet
            return r;
        } else {
            let sq = buffer.readUInt8(3); 
            let pb = this.compress(buffer, 0, length);
            let hb = Buffer.allocUnsafe(7);
            BufferHelper.writeUInt24LE(hb, pb.length);
            hb.writeUInt8(sq, 3);
            BufferHelper.writeUInt24LE(hb, length, 4);
            return Buffer.concat([hb, pb]);
        }
    }

    static compress(buffer, offset = 0, length = -1, 
        level = zlib.DEFAULT_COMPRESSION) {
        let sub = slice(buffer, offset, length);
        return zlib.deflate(sub, level);
    }

    static decompress(buffer, offset = 0, length = -1) {
        let sub = slice(buffer, offset, length);
        return zlib.inflate(sub);
    }

}

function splitPackets(buffer) {
    let r = [];
    let n = buffer.length;
    let p = 0;

    for (; p < n; ) {
        let len = BufferHelper.readUInt24LE(buffer, p) + 4;
        let sub = buffer.slice(p, p + len);
        r.push(sub);
        p += len;
    }

    return r;
}

function slice(buffer, offset = 0, length = -1) {
    let sub = buffer;
    if (length == -1) {
        length = sub.length - offset;
    }

    let end = offset + length;
    if (offset > 0 || end != sub.length) {
        sub = sub.slice(offset, end);
    }

    return sub;
}

module.exports = CompressHelper;
