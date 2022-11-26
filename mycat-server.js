const SystemConfig = require('./config/model/system-config');
const MycatConfig = require('./config/mycat-config');
const Scheduler = require('./util/scheduler');
const BufferPool = require('./buffer/buffer-pool');
const Properties = require('./util/properties');
const Logger = require('./util/logger');

class MycatServer {

    static #INSTANCE = null;

    #startupTime = 0;
    #config = new MycatConfig();
    #online = true;
    #scheduler = new Scheduler();
    #connManager = null;
    #bufferPool = null;

    #dnIndexProperties = new Properties();

    constructor() {
        if (MycatServer.#INSTANCE) {
            throw new Error(`MycatServer instance existing!`);
        }
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
        Logger.info('%s is ready to startup ...', MycatServer.NAME);
        Logger.info('System config: %s', system);
        this.#bufferPool = new BufferPool(system.bufferPoolChunkSize,
            system.bufferPoolPageSize, system.bufferPoolPageNumber);
        const ConnManager = require('./net/conn-manager');
        this.#connManager = new ConnManager(this.#bufferPool);
        
        // start server and manager
        let prefix = MycatServer.NAME;
        let addr = system.bindIp;
        let backlog = system.serverBacklog;
        // Note: here require solving the cycled reference issue.
        const ServerConnFactory = require('./server/server-conn-factory');
        const ManagerConnFactory = require('./manager/manager-conn-factory');
        let mgrFactory = new ManagerConnFactory();
        let svrFactory = new ServerConnFactory();
        const NetServer = require('./net/net-server');
        const manager = new NetServer(prefix+'Manager', addr, system.managerPort, backlog, mgrFactory);
        const server = new NetServer(prefix+'Server', addr, system.serverPort, backlog, svrFactory);
        
        let failed = true;
        try {
            manager.start();
            server.start();
            // TODO init data hosts
            failed = false;
        } finally {
            if (failed) {
                manager.stop();
                server.stop();
            }
        }
    }

    get connManager() {
        return this.#connManager;
    }

    get online() {
        return this.#online;
    }

    get config() {
        return this.#config;
    }

    get system() {
        return this.config.system;
    }

    online() {
        this.#online = true;
    }

    offline() {
        this.#online = false;
    }

    toString() {
        return MycatServer.NAME;
    }

    // Class level
    static get NAME() {
        return 'MyCat';
    }

    static getInstance() {
        return this.instance;
    }

    static get instance() {
        let server = this.#INSTANCE;
        if (server) return server;
        else return this.#INSTANCE = new MycatServer();
    }

    static uncaught(p, e) {
        if (p instanceof Error) {
            e = p;
            p = '';
        }

        if (e.stack) {
            if (p) p += ': \r\n';
            Logger.error(p + e.stack);
        } else {
            if (p) p += ': ';
            Logger.error(p + e);
        }
    }
}

class ServerHelper {

    static loadDnIndexProps() {
        const props = new Properties();
        let baseDir = SystemConfig.confPath;
        props.load(baseDir, 'dnindex.properties');
        return props;
    }

}

module.exports = MycatServer;
