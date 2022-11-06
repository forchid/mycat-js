const SystemConfig = require('./config/system-config');

class MycatServer {

    static #INSTANCE = null;

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
