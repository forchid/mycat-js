const SystemConfig = require('./config/system-config');
const MycatConfig = require('./config/mycat-config');

class MycatServer {

    static #INSTANCE = null;

    #config = null;

    constructor() {
        this.#config = new MycatConfig();
    }

    static getInstance() {
        let server = this.#INSTANCE;
        if (server) return server;
        else return this.#INSTANCE = new MycatServer();
    }

    startup() {
        SystemConfig.resetLogger();
    }

}

module.exports = MycatServer;
