const BufferHelper = require("../../buffer/buffer-helper");
const Capabilities = require("../../config/capabilities");
const MysqlPacket = require("./mysql-packet");

/**
 * From server to client in response to command, if error.
 * 
 * Bytes                       Name
 * -----                       ----
 * - 1                         field_count, always = 0xff
 * - 2                         errno
 * if capabilities & CLIENT_PROTOCOL_41 {
 * - 1                         (sqlState marker), always '#'
 * - 5                         sqlState (5 characters)
 * }
 * - n                         message(string<EOF>)
 * 
 */
class ErrorPacket extends MysqlPacket {

    static #SQL_STATE_MARKER = '#'.codePointAt(0);
    static #DEFAULT_SQL_STATE = Buffer.from('HY000');

    static get FIELD_COUNT() { return 0xff; }

    static get DEFAULT_SQL_STATE() { return this.#DEFAULT_SQL_STATE; }

    static get MYSQL_ERRMSG_SIZE() { return 512; }

    fieldCount = ErrorPacket.FIELD_COUNT;
	errno = 0;
	mark = ErrorPacket.#SQL_STATE_MARKER;
	sqlState = ErrorPacket.#DEFAULT_SQL_STATE;
    message = null; // a buffer, max length can't exceed MYSQL_ERRMSG_SIZE

    #source = null;

    get packetInfo() {
        return 'MySQL Error Packet';
    }

    calcPayloadLength() {
        let size = 3; // 1 + 2

        let cap = this.#source.capabilities;
        if (cap & Capabilities.CLIENT_PROTOCOL_41) {
            size += 6; // 1 + 5
        }
		if (this.message) {
            let max = ErrorPacket.MYSQL_ERRMSG_SIZE;
            let n = this.message.length;
            if (n > max) size += max;
			else size += n;
		}

		return size;
    }

    write(frontConn, offset = 0, flush = true) {
        this.#source = frontConn;
        let pSize = this.payloadLength = this.calcPayloadLength();
        let packetLen = frontConn.packetHeaderSize + pSize;
        let p = offset;

        let buffer = frontConn.ensureWriteBuffer(p + packetLen);
        p = BufferHelper.writeUInt24LE(buffer, pSize, p);
        p = buffer.writeInt8(this.sequenceId, p);
        p = buffer.writeInt8(this.fieldCount, p);
        p = buffer.writeUInt16LE(this.errno, p);

        let cap = frontConn.capabilities;
        if (cap & Capabilities.CLIENT_PROTOCOL_41) {
            p = buffer.writeInt8(this.mark, p);
            p += buffer.set(this.sqlState, p);
        }

        let m = this.message;
        if (m) {
            let max = ErrorPacket.MYSQL_ERRMSG_SIZE;
            let n = m.length;
            if (n > m) n = max;
            p += buffer.set(m, p);
        }

        if (flush) return frontConn.write(buffer, offset, p, flush, this);
        else return p;
    }

}

module.exports = ErrorPacket;
