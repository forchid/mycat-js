const Version = require("../../config/version");
const Logger = require("../../util/logger");
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

    write(buffer, frontConn, flush = true) {
        let p = 0;
        let cap = this.serverCapabilities;

        this.payloadLength = this.calcPayloadLength();
        let packetLength = 4 + this.payloadLength;
        frontConn.ensureSize(buffer, packetLength);
        // Header
        BufferHelper.writeUInt24LE(buffer, this.payloadLength, p);
        p += 3;
        buffer.writeInt8(this.sequenceId, p++);

        // Payload
        buffer.writeInt8(this.protocolVersion, p++);
        buffer.set(this.serverVersion, p);
        p += this.serverVersion.length;
        buffer.writeInt8(0, p++);
        buffer.writeUInt32LE(this.threadId, p);
        p += 4;

        buffer.set(this.seed, p); // auth-data-1
        p += this.seed.length;
        buffer.writeInt8(0, p++); // [00] filler

        buffer.writeUInt16LE(cap, p);
        p += 2;
        buffer.writeInt8(this.serverCharsetIndex, p++);
        buffer.writeUInt16LE(this.serverStatus, p);
        p += 2;
        // cap high part filled by filler13

        // filler13: cap high part + filler10 + filler0
        let filler13 = HandshakePacket.#FILLER_13;
        buffer.set(filler13, p);
        p += filler13.length;

        let rest = this.restOfScrambleBuff;
        buffer.set(rest, p);
        p += rest.length;
        buffer.writeInt8(0, p++);

        if (frontConn.traceProtocol) {
            let hex = BufferHelper.dumpHex(buffer, 0, p);
            Logger.info('S -> F: write %s -\r\n%s', this, hex);
        }
        frontConn.write(buffer, 0, p, flush);
    }

}

module.exports = HandshakePacket;
