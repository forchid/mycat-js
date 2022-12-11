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

    write(frontConn, offset = 0) {
        let pSize = this.payloadLength = this.calcPayloadLength();
        let packetLen = frontConn.packetHeaderSize + pSize;
        let p = offset;

        let buffer = frontConn.ensureWriteBuffer(p + packetLen);
        p = BufferHelper.writeUInt24LE(buffer, pSize, p);
        p = buffer.writeUInt8(this.sequenceId, p);

        p = buffer.writeUInt8(AuthSwitchPacket.#STATUS, p);
        p += buffer.set(this.pluginName, p);
        p += buffer.set(this.authData, p);

        return frontConn.send(buffer, offset, p, this);
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
