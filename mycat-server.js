const SystemConfig = require('./config/model/system-config');
const MycatConfig = require('./config/mycat-config');
const Scheduler = require('./util/scheduler');
const BufferPool = require('./buffer/buffer-pool');
const Properties = require('./util/properties');
const Logger = require('./util/logger');
const RouteService = require('./route/route-service');

class MycatServer {

    static #INSTANCE = null;

    #startupTime = 0;
    #config = new MycatConfig();
    #online = true;
    #scheduler = new Scheduler();
    #connManager = null;
    #bufferPool = null;
    // Init route service
    #routeService = new RouteService();

    #dnIndexProperties = new Properties();

    constructor() {
        if (MycatServer.#INSTANCE) {
            throw new Error(`MycatServer instance existing!`);
        }
        // TODO
        // SQL recorder
        // Init cache service

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
        const dataHosts = config.dataHosts;

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
        const ServerConnFactory = require('./frontend/server/server-conn-factory');
        const ManagerConnFactory = require('./frontend/manager/manager-conn-factory');
        let mgrFactory = new ManagerConnFactory();
        let svrFactory = new ServerConnFactory();
        const NetServer = require('./net/net-server');
        const manager = new NetServer(prefix+'Manager', addr, system.managerPort, backlog, mgrFactory);
        const server = new NetServer(prefix+'Server', addr, system.serverPort, backlog, svrFactory);

        let failed = true;
        try {
            manager.start();
            server.start();
            // init data hosts
            for (let dbPool of dataHosts.values()) {
                let hostName = dbPool.hostName;
                let index = this.#dnIndexProperties.getIntProperty(hostName, 0);
                if (index !== 0) {
                    Logger.info(`Init dataHost '${hostName}' by using source#${index}.`);
                }
                dbPool.init(index);
                dbPool.startHeartbeat();
            }
            failed = false;
        } finally {
            if (failed) {
                manager.stop();
                server.stop();
            }
        }

        // Schedule timers 
        let scheduler = this.#scheduler;
        scheduler.schedule("dataNodeHeartbeat", () => {
            Logger.debug("DataNode heartbeat start.");
            for (let dbPool of dataHosts.values()) {
                dbPool.doHeartbeat();
            }
            Logger.debug("DataNode heartbeat end.");
        }, 0, system.dataNodeHeartbeatPeriod);
    }

    saveDataHostIndex(hostName, index) {
        let props = this.#dnIndexProperties;
        props.setProperty(hostName, index);
        ServerHelper.saveDnIndexProps(props);
    }

    get routeService() {
        return this.#routeService;
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

    static #dnindexFile = "dnindex.properties";

    static loadDnIndexProps() {
        const props = new Properties();
        let baseDir = SystemConfig.confPath;
        props.load(baseDir, this.#dnindexFile);
        return props;
    }

    static saveDnIndexProps(props) {
        let baseDir = SystemConfig.confPath;
        props.save(baseDir, this.#dnindexFile);
    }

}

module.exports = MycatServer;
