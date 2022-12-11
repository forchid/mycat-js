const BufferHelper = require("../../buffer/buffer-helper");
const MysqlMessage = require("./mysql-message");
const MysqlPacket = require("./mysql-packet");

/**
 * From server to client, part of result set packets. One for each column in the
 * result set. Thus, if the value of field_columns or fieldCount in the result set
 * header packet is 3, then the field packet occurs 3 times.
 * 
 * Bytes                        Name
 * -----                        ----
 * - n (Length Coded String)    catalog
 * - n (Length Coded String)    db
 * - n (Length Coded String)    table
 * - n (Length Coded String)    org_table
 * - n (Length Coded String)    name
 * - n (Length Coded String)    org_name
 * - 1                          (filler)
 * - 2                          charsetNumber
 * - 4                          length
 * - 1                          type
 * - 2                          flags
 * - 1                          decimals
 * - 2                          (filler), always 0x00
 * - n (Length Coded Binary)    default
 */
class FieldPacket extends MysqlPacket {

    static #DEFAULT_CATALOG = Buffer.from("def");
    static #FILLER = Buffer.alloc(2);

    static get UNSIGNED_FLAG() { return 0x0020; }

    catalog = FieldPacket.#DEFAULT_CATALOG;
	db = null;
	table = null;

    orgTable = null;
	name = null;

    orgName = null;
	charsetIndex = 0;
	length = 0;
	type = 0;

    flags = 0;
	decimals = 0;
	definition = null;

    get packetInfo() {
        return "MySQL Field Packet";
    }

    calcPayloadLength() {
        let size = this.catalog? MysqlMessage.bufferLength(this.catalog): 1;
        size += this.db? MysqlMessage.bufferLength(this.db): 1;
        size += this.table? MysqlMessage.bufferLength(this.table): 1;
        size += this.orgTable? MysqlMessage.bufferLength(this.orgTable): 1;
        size += this.name? MysqlMessage.bufferLength(this.name): 1;
        size += this.orgName? MysqlMessage.bufferLength(this.orgName): 1;
        size += 13;// 1+2+4+1+2+1+2
        if (this.definition) {
            size += MysqlMessage.bufferLength(this.definition);
        }
        return this.payloadLength = size;
    }

    write(frontConn, offset = 0, flush = false) {
        let payloadLen = this.calcPayloadLength();
        let packetLen = frontConn.packetHeaderSize + payloadLen;
        let p = offset;
        let buffer = frontConn.ensureWriteBuffer(p + packetLen);

        p = BufferHelper.writeUInt24LE(buffer, payloadLen, p);
        p = buffer.writeUInt8(this.sequenceId, p);

        p = MysqlMessage.writeBytesWithLength(buffer, this.catalog, p);
        p = MysqlMessage.writeBytesWithLength(buffer, this.db, p);
        p = MysqlMessage.writeBytesWithLength(buffer, this.table, p);
        p = MysqlMessage.writeBytesWithLength(buffer, this.orgTable, p);
        p = MysqlMessage.writeBytesWithLength(buffer, this.name, p);
        p = MysqlMessage.writeBytesWithLength(buffer, this.orgName, p);
        p = buffer.writeInt8(0x0c, p); // filler
        p = buffer.writeUInt16LE(this.charsetIndex, p);
        p = buffer.writeUInt32LE(this.length, p);
        p = buffer.writeUInt8(this.type, p);
        p = buffer.writeUInt16LE(this.flags, p);
        p = buffer.writeInt8(this.decimals, p);
        p += buffer.set(FieldPacket.#FILLER, p);

        if (this.definition) {
            p = MysqlMessage.writeBytesWithLength(buffer, this.definition, p);
        }

        if (flush) return frontConn.write(buffer, 0, p, flush, this);
        else return p;
    }

}

module.exports = FieldPacket;
