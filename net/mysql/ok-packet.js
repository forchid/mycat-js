const BufferHelper = require("../../buffer/buffer-helper");
const MysqlMessage = require("./mysql-message");
const MysqlPacket = require("./mysql-packet");

class OkPacket extends MysqlPacket {

    static #OK = Buffer.from([7, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0]);

    static get FIELD_COUNT() { return 0x00; }

    static get OK() { return this.#OK; }

    fieldCount = OkPacket.FIELD_COUNT;
	affectedRows = 0;
	insertId = 0;
	serverStatus = 0;
	warningCount = 0;
	message = null; // a buffer

    get packetInfo() { return "MySQL Ok Packet"; }

    calcPayloadLength() {
        let size = 1;

        size += MysqlMessage.lengthEncodedOf(this.affectedRows);
        size += MysqlMessage.lengthEncodedOf(this.insertId);
        size += 4;
        let m = this.message;
        if (m) {
            size += MysqlMessage.bufferLength(m);
        }

        return size;
    }

    write(frontConn, offset = 0, flush = true) {
        let payloadLen = this.payloadLength = this.calcPayloadLength();
        let packetLen = frontConn.packetHeaderSize + payloadLen;
        let p = offset;

        let buffer = frontConn.ensureWriteBuffer(p + packetLen);
        p = BufferHelper.writeUInt24LE(buffer, payloadLen, p);
        p = buffer.writeUInt8(this.sequenceId, p);

        p = buffer.writeInt8(this.fieldCount, p);
        p = MysqlMessage.writeLengthEncoded(buffer, this.affectedRows, p);
        p = MysqlMessage.writeLengthEncoded(buffer, this.insertId, p);
        p = buffer.writeUInt16LE(this.serverStatus, p);
        p = buffer.writeUInt16LE(this.warningCount, p);
        let m = this.message;
        if (m) {
            p = MysqlMessage.writeBytesWithLength(buffer, m, p);
        }
        
        if (flush) return frontConn.send(buffer, offset, p, this);
        else return p;
    }

}

module.exports = OkPacket;
