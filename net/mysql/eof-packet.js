const BufferHelper = require("../../buffer/buffer-helper");
const MysqlPacket = require("./mysql-packet");

/**
 * From server to client, at the end of a series of Field Packets, and at the
 * end of a series of data packets. With prepared statements, Eof Packet can also
 * end parameter information, which we'll describe later.
 * 
 * Bytes                   Name
 * -----                   ----
 * - 1                     field_count, always = 0xfe
 * - 2                     warning_count
 * - 2                     Status Flags
 */
class EofPacket extends MysqlPacket {

    static get FIELD_COUNT() { return 0xfe; }

    fieldCount = EofPacket.FIELD_COUNT;
    warningCount = 0;
    status = 2;

    get packetInfo() {
        return "MySQL Eof Packet";
    }

    calcPayloadLength() {
        return 5; // 1 + 2 + 2;
    }

    write(frontConn, offset = 0, flush = false) {
        let pSize = this.payloadLength = this.calcPayloadLength();
        let packetLen = frontConn.packetHeaderSize + pSize;
        let p = offset;

        let buffer = frontConn.ensureWriteBuffer(p + packetLen);
        p = BufferHelper.writeUInt24LE(buffer, pSize, p);
        p = buffer.writeUInt8(this.sequenceId, p);
        p = buffer.writeUInt8(this.fieldCount, p);
        p = buffer.writeUInt16LE(this.warningCount, p);
        p = buffer.writeUInt16LE(this.status, p);

        if (flush) return frontConn.write(buffer, 0, p, flush, this);
        else return p;
    }

}

module.exports = EofPacket;
