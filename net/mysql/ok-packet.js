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
            size += MysqlMessage.lengthEncodedOf(m);
            size += m.length;
        }

        return size;
    }

    write(frontConn) {
        let length = this.calcPayloadLength();
        let buffer = frontConn.writeBuffer();
        let p = 0;

        frontConn.ensureSize(buffer, 4 + length);
        BufferHelper.writeUInt24LE(buffer, length, p);
        buffer.writeUInt8(this.sequenceId, p++);

        buffer.writeInt8(this.fieldCount, p++);
        p += MysqlMessage.writeLengthEncodedInt(buffer, this.affectedRows, p);
        p += MysqlMessage.writeLengthEncodedInt(buffer, this.insertId, p);
        buffer.writeUInt16LE(this.serverStatus, p);
        p += 2;
        buffer.writeUInt16LE(this.warningCount, p);
        p += 2;
        let m = this.message;
        if (m) {
            p += MysqlMessage.writeBytesWithLength(buffer, m, p);
        }
        frontConn.send(buffer, 0, p, this);
    }

}

module.exports = OkPacket;
