const MysqlPacket = require("./mysql-packet");

class QuitPacket extends MysqlPacket {

    static #QUIT = Buffer.from([1, 0, 0, 0, 1]);

    calcPayloadLength() { return 1; }

    get packetInfo() { return 'MySQL Quit Packet'; }

    static get QUIT() { return this.#QUIT; }
}

module.exports = QuitPacket;
