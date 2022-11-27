const BufferHelper = require("../../buffer/buffer-helper");
const MysqlMessage = require("./mysql-message");
const MysqlPacket = require("./mysql-packet");

/**
 * - 1              [fe]
 * - string[NUL]    plugin name
 * - string[EOF]    auth plugin data
 */
class AuthSwitchPacket extends MysqlPacket {

    static #STATUS = 0xFE;

    pluginName = Buffer.alloc(0);
    authData = Buffer.alloc(0);

    constructor (pluginName, authData) {
        if (pluginName) this.pluginName = pluginName;
        if (authData) this.authData = authData;
    }

    read(buffer) {
        let m = new MysqlMessage(buffer);
        this.payloadLength = m.readUInt24();
        this.sequenceId = m.readUInt8();
        this.authData = m.readBytes(this.payloadLength);
    }

    write(buffer, frontConn) {
        let payloadLen = this.calcPayloadLength();
        let p = 0;

        frontConn.ensureSize(buffer, 4  + payloadLen);
        BufferHelper.writeUInt24LE(buffer, payloadLen, p);
        p += 3;
        buffer.writeUInt8(this.sequenceId, p++);

        buffer.writeUInt8(AuthSwitchPacket.#STATUS, p++);
        buffer.set(this.pluginName, p);
        p += this.pluginName.length;
        buffer.set(this.authData, p);
        p += this.authData.length;

        frontConn.send(buffer, 0, p, this);
    }

    calcPayloadLength() {
        let size = 3; //s tatus
        size += this.pluginName.length + 1;
        size += this.authData.length;
        return size;
    }

    get packetInfo() { return 'MySQL Auth Switch Packet'; }

}

module.exports = AuthSwitchPacket;
