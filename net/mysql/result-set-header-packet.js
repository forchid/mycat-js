const BufferHelper = require("../../buffer/buffer-helper");
const MysqlMessage = require("./mysql-message");
const MysqlPacket = require("./mysql-packet")

/**
 * From server to client after command, if no error and result set -- that is,
 * if the command was a query which returned a result set. The result set header
 * packet is the first of several, possibly many, packets that the server sends
 * for result sets. The order of packets for a result set is:
 * 
 * - (Result Set Header Packet)   the number of columns
 * - (Field Packets)              column descriptors
 * - (EOF Packet)                 marker: end of Field Packets
 * - (Row Packets)                row contents
 * - (EOF Packet)                 marker: end of Data Packets
 * 
 * Bytes                          Name
 * -----                          ----
 * - 1-9   (Length-Coded-Binary)  field_count
 * - 1-9   (Length-Coded-Binary)  extra
 */
class ResultSetHeaderPacket extends MysqlPacket {

    /** Field count of the result set. */
    fieldCount = 0;
    extra = 0;

    constructor (fieldCount) {
        super();
        this.fieldCount = fieldCount;
    }

    get packetInfo() {
        return "MySQL ResultSetHeader Packet";
    }

    write(frontConn, offset = 0, flush = false) {
        let pSize = this.calcPayloadLength();
        let packetLen = frontConn.packetHeaderSize + pSize;
        let p = offset;
        let buffer = frontConn.ensureWriteBuffer(p + packetLen);

        p = BufferHelper.writeUInt24LE(buffer, pSize, p);
        p = buffer.writeUInt8(this.sequenceId, p);
        p = MysqlMessage.writeLengthEncoded(buffer, this.fieldCount, p);
        if (this.extra > 0) {
            p = MysqlMessage.writeLengthEncoded(buffer, this.extra, p);
        }

        if (flush) return frontConn.write(buffer, 0, p, flush, this);
        else return p;
    }

    calcPayloadLength() {
        let size = MysqlMessage.lengthEncodedOf(this.fieldCount);
        let extra = this.extra;
        if (extra > 0) {
            size += MysqlMessage.lengthEncodedOf(this.extra);
        }
        return this.payloadLength = size;
    }

}

module.exports = ResultSetHeaderPacket;
