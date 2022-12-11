const BufferHelper = require("../../buffer/buffer-helper");
const MysqlMessage = require("./mysql-message");
const MysqlPacket = require("./mysql-packet");

/**
 * From server to client. One packet for each row in the result set.
 * 
 * Bytes                     Name
 * -----                     ----
 * - n (Length Coded String) (column value)
 * - ...
 * 
 * (column value):         The data in the column, as a character string.
 *                         If a column is defined as non-character, the
 *                         server converts the value into a character
 *                         before sending it. Since the value is a Length
 *                         Coded String, a NULL can be represented with a
 *                         single byte containing 251(see the description
 *                         of Length Coded Strings in section "Elements" above).
 */
class RowPacket extends MysqlPacket {

    static #NULL_MARK = 251;
    static #EMPTY_MARK = 0;

    value = null;
	fieldCount = 0;
    /** buffer(column) array */
	fieldValues = [];

    constructor (fieldCount) {
        super();
        this.fieldCount = fieldCount;
    }

    get packetInfo() {
        return "MySQL Row Packet";
    }

    append(value) {
        this.fieldValues.push(value);
        return this;
    }

    addFieldCount(n) {
        this.fieldCount += n;
        return this;
    }

    calcPayloadLength() {
        let length = 0;
        let n = this.fieldCount;
        let values = this.fieldValues;

        for (let i = 0; i < n; ++i) {
            let v = values[i];
            if (v && v.length > 0) {
                length += MysqlMessage.bufferLength(v);
            } else {
                length += 1;
            }
        }

        return this.payloadLength = length;
    }

    write(frontConn, offset = 0, flush = false) {
        const headerSize = MysqlPacket.packetHeaderSize;
        const maxSize = MysqlPacket.maxPayloadSize;
        const maxBuffer = headerSize + maxSize;

        let payloadLen = this.calcPayloadLength();
        const packetLen = headerSize + payloadLen;
        let p = offset;
        const bufSize = Math.min(p + packetLen, maxBuffer);
        const buffer = frontConn.ensureWriteBuffer(bufSize);
        
        const fieldCount = this.fieldCount;
        const fieldValues = this.fieldValues;
        let splitSize = Math.min(payloadLen, maxSize);
        // 1) First header
        if (p + headerSize > maxBuffer) { // Send full buffer
            p = offset = frontConn.send(buffer, 0, p, this);
        }
        p = BufferHelper.writeUInt24LE(buffer, splitSize, p);
        p = buffer.writeUInt8(this.sequenceId++, p);
        payloadLen -= splitSize;

        // Payload or split packet: empty if split size 0
        for (let i = 0; i < fieldCount; ++i) {
            let v = fieldValues[i];
            if (v && v.length > 0) {
                let n = MysqlMessage.bufferLength(v);
                if (p + n > maxBuffer) {
                    p = frontConn.send(buffer, 0, p, this);
                }
                let len = v.length;
                p = MysqlMessage.writeLengthEncoded(buffer, len, p);
                n -= len;
                let r = maxBuffer - p;
                let s = 0;
                for (; n > r; ) {
                    let sub = v.slice(s, s + r);
                    p += buffer.set(sub, p);
                    p = frontConn.send(buffer, 0, p, this);
                    // 2) Start a new split packet
                    if (splitSize !== maxSize) {
                        throw new Error(`splitSize ${splitSize} not correct!`);
                    }
                    splitSize = Math.min(payloadLen, maxSize);
                    p = BufferHelper.writeUInt24LE(buffer, splitSize, p);
                    p = buffer.writeUInt8(this.sequenceId++, p);
                    payloadLen -= splitSize;
                    // Next try to split
                    n -= r;
                    s += r;
                    r = maxBuffer - p;
                }
                // Append rest
                if (n > 0) {
                    let sub = s? v.slice(s, s + n): v;
                    p += buffer.set(sub, p);
                }
            } else {
                let m = v? RowPacket.#EMPTY_MARK: RowPacket.#NULL_MARK;
                if (p + 1 > maxBuffer) {
                    p = frontConn.send(buffer, 0, p, this);
                    // 3) Start a new split packet
                    if (splitSize !== maxSize) {
                        throw new Error(`splitSize ${splitSize} not correct!`);
                    }
                    splitSize = Math.min(payloadLen, maxSize);
                    p = BufferHelper.writeUInt24LE(buffer, splitSize, p);
                    p = buffer.writeUInt8(this.sequenceId++, p);
                    payloadLen -= splitSize;
                }
                p = buffer.writeUInt8(m, p);
            }
        }

        // Last check whether full or not
        if (p === maxBuffer) {
            // 4) Just full split packet
            p = frontConn.send(buffer, 0, p, this);
            // 5) Append a empty packet
            if (splitSize !== maxSize) {
                throw new Error(`splitSize ${splitSize} not correct!`);
            }
            splitSize = Math.min(payloadLen, maxSize);
            p = BufferHelper.writeUInt24LE(buffer, splitSize, p);
            p = buffer.writeUInt8(this.sequenceId++, p);
            payloadLen -= splitSize;
            if (splitSize !== 0) {
                throw new Error(`splitSize ${splitSize} not correct!`);
            }
        }
        if (payloadLen !== 0) {
            throw new Error(`payloadLen ${payloadLen} not correct!`);
        }

        if (flush && p > 0) {
            return frontConn.send(buffer, 0, p, this);
        } else {
            return p;
        }
    }

}

module.exports = RowPacket;
