const SystemConfig = require('./config/model/system-config');
const MycatConfig = require('./config/mycat-config');
const Scheduler = require('./util/scheduler');

const path = require('path');
const fs = require('fs');
const BufferPool = require('./buffer/buffer-pool');

class MycatServer {

    static #INSTANCE = null;

    #startupTime = 0;
    #config = new MycatConfig();
    #online = true;
    #scheduler = new Scheduler();
    #bufferPool = null;

    #dnIndexProperties = new Map();

    constructor() {
        // TODO
        // SQL recorder
        // Init cache service
        // Init route service

        // Load dataNode active index from properties
        this.#dnIndexProperties = ServerHelper.loadDnIndexProps();

        // TODO
        // Init SQL interceptor
        // Init catlet loader
        // Init zk switch

        this.#startupTime = new Date().getTime();
    }

    startup() {
        SystemConfig.resetLogger();
        const config = this.config;
        const system = config.system;

        // TODO route strategy
        console.info('%s is ready to startup ...', MycatServer.NAME);
        console.info('System config: %s', system);
        this.#bufferPool = new BufferPool(system.bufferPoolChunkSize,
            system.bufferPoolPageSize, system.bufferPoolPageNumber);

        // TODO mycat container/context
        // start server and manager
        
    }

    get online() {
        return this.#online;
    }

    get config() {
        return this.#config;
    }

    // Class level
    static get NAME() {
        return 'MyCat';
    }

    static get instance() {
        let server = this.#INSTANCE;
        if (server) return server;
        else return this.#INSTANCE = new MycatServer();
    }

}

class ServerHelper {

    static loadDnIndexProps() {
        const props = new Map();
        let baseDir = SystemConfig.confPath;
        let file = path.join(baseDir, 'dnindex.properties');
        
        try {
            let lines = fs.readLines(file);
            for (let line of lines) {
                line = line.trim();
                if (line.startsWith('#') || line === '') {
                    continue;
                }
                let i = line.indexOf('=');
                if (i === -1) throw new Error(`A line no separator '=' in ${file}`);
                let key = line.slice(0, i);
                let val = line.slice(i + 1);
                props.set(key, val);
            }
        } catch (e) {
            if (e.code != 'ENOENT') throw e;
        }

        return props;
    }

}

module.exports = MycatServer;
