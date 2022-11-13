const SystemConfig = require('./config/model/system-config');
const MycatConfig = require('./config/mycat-config');

class MycatServer {

    static #INSTANCE = null;

    #config = null;

    constructor() {
        this.#config = new MycatConfig();
    }

    static get instance() {
        let server = this.#INSTANCE;
        if (server) return server;
        else return this.#INSTANCE = new MycatServer();
    }

    startup() {
        SystemConfig.resetLogger();
    }

}

module.exports = MycatServer;
