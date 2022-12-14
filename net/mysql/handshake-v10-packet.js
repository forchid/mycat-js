const BufferHelper = require("../../buffer/buffer-helper");
const Capabilities = require("../../config/capabilities");
const Version = require("../../config/version");
const MysqlPacket = require("./mysql-packet");

/**
 * From mycat server to client during initial handshake.
 * 
 * Bytes                        Name
 * -----                        ----
 * - 1                            protocol_version (always 0x0a)
 * - n (string[NULL])             server_version
 * - 4                            thread_id
 * - 8 (string[8])                auth-plugin-data-part-1
 * - 1                            (filler) always 0x00
 * - 2                            capability flags (lower 2 bytes)
 * -   if more data in the packet:
 * - 1                            character set
 * - 2                            status flags
 * - 2                            capability flags (upper 2 bytes)
 * -   if capabilities & CLIENT_PLUGIN_AUTH {
 * - 1                            length of auth-plugin-data
 * -   } else {
 * - 1                            0x00
 * -   }
 * - 10 (string[10])              reserved (all 0x00)
 * -  if capabilities & CLIENT_SECURE_CONNECTION {
 * -    string[$len]   auth-plugin-data-part-2 ($len=MAX(13, length of auth-plugin-data - 8))
 * -  }
 * -  if capabilities & CLIENT_PLUGIN_AUTH {
 * -    string[NUL]    auth-plugin name
 * -  }
 * 
 */
class HandshakeV10Packet extends MysqlPacket {

    static #FILLER_10 = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    static #DEFAULT_AUTH_PLUGIN_NAME = Buffer.from('mysql_native_password');

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
    authPluginName = HandshakeV10Packet.#DEFAULT_AUTH_PLUGIN_NAME;
    
    get packetInfo() {
        return 'MySQL HandshakeV10 Packet';
    }

    calcPayloadLength() {
        let size = 1; // protocol version
        size += (this.serverVersion.length + 1); // server version
        size += 4; // connection id
        size += this.seed.length; // len of auth-plugin-data-part-1
        size += 1; // [00] filler
        size += 2; // capability flags (lower 2 bytes)
        size += 1; // character set
        size += 2; // status flags
        size += 2; // capability flags (upper 2 bytes)
        size += 1; // length of auth-plugin-data or [00] filler
        size += 10; // reserved (all [00])

        let cap = this.serverCapabilities;
        if (cap & Capabilities.CLIENT_SECURE_CONNECTION) {
            // restOfScrambleBuff.length always to be 12
            let restSize = this.restOfScrambleBuff.length;
            if (restSize <= 13) size += 13;
            else size += restSize;
        }
        
        if((cap & Capabilities.CLIENT_PLUGIN_AUTH) != 0) {
        	size += (this.authPluginName.length + 1); // auth-plugin name
        }

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
        p = buffer.writeUInt16LE(cap >> 16, p);

        const rest = this.restOfScrambleBuff;
        const restSize = rest.length;
        if (cap & Capabilities.CLIENT_PLUGIN_AUTH) {
            let n = restSize;
            if (n < 13) n = 13;
            n += this.seed.length;
            p = buffer.writeInt8(n, p);
        } else {
            p = buffer.writeInt8(0, p);
        }

        let filler10 = HandshakeV10Packet.#FILLER_10;
        p += buffer.set(filler10, p); // reserved: filler 10

        if (cap & Capabilities.CLIENT_SECURE_CONNECTION) {
            p += buffer.set(rest, p); // auth-data-2
            if (restSize < 13) { // Padding 0
                let n = 13 - restSize;
                for (let i = 0; i < n; ++i) {
                    p = buffer.writeInt8(0, p);
                }
            }
        }

        if (cap & Capabilities.CLIENT_PLUGIN_AUTH) {
            p += buffer.set(this.authPluginName, p);
            p = buffer.writeInt8(0, p);
        }

        if (flush) return frontConn.write(buffer, offset, p, flush, this);
        else return p;
    }

    static get DEFAULT_AUTH_PLUGIN_NAME() {
        return this.#DEFAULT_AUTH_PLUGIN_NAME;
    }

}

module.exports = HandshakeV10Packet;
