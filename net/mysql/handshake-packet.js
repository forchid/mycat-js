const BufferHelper = require("../../buffer/buffer-helper");
const Version = require("../../config/version");
const MysqlPacket = require("./mysql-packet");

/**
 * From server to client during initial handshake.
 * 
 * Bytes                        Name
 * -----                        ----
 * - 1                            protocol_version
 * - n (Null-Terminated String)   server_version
 * - 4                            thread_id
 * - 8                            scramble_buff
 * - 1                            (filler) always 0x00
 * - 2                            server_capabilities
 * - 1                            server_language
 * - 2                            server_status
 * - 13                           (filler) always 0x00 ...
 * - 13                           rest of scramble_buff (4.1)
 */
class HandshakePacket extends MysqlPacket {

    static #FILLER_13 = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

    protocolVersion = Version.PROTOCOL_VERSION;
    serverVersion = Version.SERVER_VERSION;
    threadId = 0;
    /** auth-plugin-data-part-1 */
    seed = null;
    serverCapabilities = 0;
    serverCharsetIndex = 0;
    serverStatus = 0;
    /** auth-plugin-data-part-2 */
    restOfScrambleBuff = null;

    get packetInfo() {
        return 'MySQL Handshake Packet';
    }

    calcPayloadLength() {
        let size = 1;
        size += this.serverVersion.length; // n
        size += 5;// 1+4
        size += this.seed.length;// 8
        size += 19;// 1+2+1+2+13
        size += this.restOfScrambleBuff.length;// 12
        size += 1;// 1

        return size;
    }

    write(frontConn, offset = 0, flush = true) {
        let cap = this.serverCapabilities;
        let pSize = this.payloadLength = this.calcPayloadLength();
        let packetLength = frontConn.packetHeaderSize + pSize;
        let p = offset;

        let buffer = frontConn.ensureWriteBuffer(p + packetLength);
        // Header
        p = BufferHelper.writeUInt24LE(buffer, pSize, p);
        p = buffer.writeInt8(this.sequenceId, p);

        // Payload
        p = buffer.writeInt8(this.protocolVersion, p);
        p += buffer.set(this.serverVersion, p);
        p = buffer.writeInt8(0, p);
        p = buffer.writeUInt32LE(this.threadId, p);

        p += buffer.set(this.seed, p); // auth-data-1
        p = buffer.writeInt8(0, p); // [00] filler

        p = buffer.writeUInt16LE(cap, p);
        p = buffer.writeInt8(this.serverCharsetIndex, p);
        p = buffer.writeUInt16LE(this.serverStatus, p);
        // cap high part filled by filler13

        // filler13: cap high part + filler10 + filler0
        let filler13 = HandshakePacket.#FILLER_13;
        p += buffer.set(filler13, p);

        let rest = this.restOfScrambleBuff;
        p += buffer.set(rest, p);
        p = buffer.writeInt8(0, p);

        if (flush) return frontConn.write(buffer, offset, p, flush, this);
        else return p;
    }

}

module.exports = HandshakePacket;
