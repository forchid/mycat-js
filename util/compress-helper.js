const UnsupportedError = require("../lang/unsupported-error");
const MysqlMessage = require("../net/mysql/mysql-message");

const zlib = require('zlib');

class CompressHelper {

    constructor () {
        throw new UnsupportedError('CompressHelper()');
    }

    static decompressMysqlPacket(buffer, length = -1) {
        let m = new MysqlMessage(buffer, length);
        let payloadLen = m.readUInt24();
        m.skip();
        let uncLen = m.readUInt24();

        if (uncLen === 0) {
            let r = Buffer.allocUnsafe(4 + payloadLen);
            buffer.copy(r, 0, 0, 4);
            buffer.copy(r, 4, 7);
            return r;
        } else {
            let pb = CompressHelper.decompress(buffer, 7, payloadLen);
            let hb = Buffer.allocUnsafe(4);
            buffer.copy(hb, 0, 0, 4);
            return Buffer.concat(hb, pb);
        }
    }

    static decompress(buffer, offset = 0, len = -1) {
        let sub = buffer;
        if (len == -1) {
            len = sub.length - offset;
        }

        let end = offset + len;
        if (end != sub.length) {
            sub = sub.slice(offset, end);
        }

        return zlib.inflate(sub);
    }

}

module.exports = CompressHelper;
