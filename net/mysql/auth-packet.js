const Capabilities = require("../../config/capabilities");
const CharsetHelper = require("../../util/charset-helper");
const MysqlMessage = require("./mysql-message");
const MysqlPacket = require("./mysql-packet");

const iconv = require('iconv');
const ErrorCode = require("./error-code");

/**
 * From client to server during initial handshake(HandshakeResponse41).
 * 
 * Bytes                        Name
 * -----                        ----
 * - 4                            client_flags
 * - 4                            max_packet_size
 * - 1                            charset_number
 * - 23                           (filler) always 0x00...
 * - n (Null-Terminated String)   user
 * - n (Length Coded Binary)      scramble_buff (1 + x bytes)
 * if capabilities & CLIENT_CONNECT_WITH_DB {
 * - n (Null-Terminated String)   database name (optional, interpreted using charset_number field)
 * }
 * if capabilities & CLIENT_PLUGIN_AUTH {
 * - n (Null-Terminated String)   client_plugin_name (optional, a utf8 string)
 * }
 * if capabilities & CLIENT_CONNECT_ATTRS {
 * - n (Length Coded integer)     length of all key-values
 * - n (Length Coded String)      key1
 * - n (Length Coded String)      value1
 * ...
 * }
 */
class AuthPacket extends MysqlPacket {

    static #FILLER = Buffer.alloc(23);

    clientFlags = 0;
    maxPacketSize = 0;
    charsetIndex = 0;
    user = '';
    password = null;
    database = '';
    allowMultiStatements = false;
    clientAuthPlugin = '';

    read(buffer, source, length = -1) {
        let m = new MysqlMessage(buffer, length);
        this.payloadLength = m.readUInt24();
        this.sequenceId = m.readUInt8();
        this.clientFlags = m.readUInt32();
        if (this.clientFlags & Capabilities.CLIENT_MULTI_STATEMENTS) {
            this.allowMultiStatements = true;
        }
        
        // Client max packet size limit
        this.maxPacketSize = m.readUInt32();
        this.charsetIndex = m.readUInt8();
        m.skip(AuthPacket.#FILLER.length);
        this.user = m.readStringWithNull();
        this.password = m.readBytesWithLength();

        if (this.clientFlags & Capabilities.CLIENT_CONNECT_WITH_DB) {
            let charset = CharsetHelper.charset(this.charsetIndex);
            if (!iconv.isEncoding(charset)) {
                let errno = ErrorCode.ER_UNKNOWN_CHARACTER_SET;
                source.sendError(2, errno, charset);
                return { ok: false, msg: message };
            }
            if (m.hasRemaining) {
                let db = m.readStringWithNull(charset);
                this.database = db || '';
            }
        }
        if (this.clientFlags & Capabilities.CLIENT_PLUGIN_AUTH) {
            this.clientAuthPlugin = m.readStringWithNull();
        }

        return { ok: true };
    }

}

module.exports = AuthPacket;
