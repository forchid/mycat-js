const PhysicalDbNode = require("../backend/data-source/physical-db-node");
const PhysicalDbPool = require("../backend/data-source/physical-db-pool");
const MysqlDataSource = require("../backend/mysql/mysql-data-source");
const SqliteDataSource = require("../backend/sqlite/sqlite-data-source");
const ConfigError = require("./config-error");
const XMLConfigLoader = require("./loader/xml/xml-config-loader");
const XMLSchemaLoader = require("./loader/xml/xml-schema-loader");
const XMLServerLoader = require("./loader/xml/xml-server-loader");

class ConfigInitializer {

    #system = null;
	#cluster = null;
	#firewall = null;
	#users = new Map();
	#schemas = new Map();
	#dataNodes = new Map();
	#dataHosts = new Map();

    constructor(options) {
        options = options || {};
        let schemaLoader = new XMLSchemaLoader(options.schemaFile, options.ruleFile);
        let serverLoader = new XMLServerLoader(options.serverFile);
        let configLoader = new XMLConfigLoader(schemaLoader, serverLoader);

        this.#system = configLoader.system;
        this.#users = configLoader.users;
        this.#schemas = configLoader.schemas;

        let initializer = new Initializer(this, configLoader);
        if (options.loadDataHost) {
            this.#dataHosts = initializer.initDataHosts();
            this.#dataNodes = initializer.initDataNodes();
            initializer.initHostSchemas();
        }

        this.#firewall = configLoader.firewall;
        this.#cluster = configLoader.cluster;

        // TODO sequence
        initializer.selfChecking();
    }

    get system() {
        return this.#system;
    }

    get dataHosts() {
        return this.#dataHosts;
    }

    get dataNodes() {
        return this.#dataNodes;
    }

    get cluster() {
        return this.#cluster;
    }

    get firewall() {
        return this.#firewall;
    }

    get users() {
        return this.#users;
    }

    get schemas() {
        return this.#schemas;
    }

}

class Initializer {

    #configInitializer = null;
    #configLoader = null;

    constructor (configInitializer, configLoader) {
        this.#configInitializer = configInitializer;
        this.#configLoader = configLoader;
    }

    selfChecking() {
        const config = this.#configInitializer;
        const schemas = config.schemas;
        const users = config.users;
        const dataHosts = config.dataHosts;
        const dataNodes = config.dataNodes;

        // Check schemas
        if (!schemas || schemas.size === 0) {
            throw new ConfigError('Self checking: all schema empty!');
        }
        for (let conf of schemas.values()) {
            if (!conf) {
                throw new ConfigError('Self checking: empty schema exists!');
            }
            if (dataHosts.size > 0 && dataNodes.size > 0) {
                let allNames = conf.allDataNodes;
                for (let name of allNames) {
                    if (!dataNodes.has(name)) {
                        let s = conf.name;
                        let e = `Self checking: dataNode '${name}' of the schema '${s}' doesn't exist!`;
                        throw new ConfigError(e);
                    }
                }
            }
        }

        // Check users and their schemas
        if (!users || users.size === 0) {
            throw new ConfigError('Self checking: all user empty!');
        }
        for (let user of users.values()) {
            if (!user) {
                throw new ConfigError('Self checking: empty user exists!');
            }
            let userSchemas = user.schemas;
            if (!userSchemas || userSchemas.size === 0) {
                let name = user.name;
                let er = `Self checking: schemas of the user '${name}' empty!`;
                throw new ConfigError(er);
            }
            for (let schema of userSchemas) {
                if (!schemas.has(schema)) {
                    let name = user.name;
                    let er = `Self checking: schema '${schema}' of the user '${name}' doesn't exist!`;
                    throw new ConfigError(er);
                }
            }
        }
    }

    initDataHosts() {
        const configLoader = this.#configLoader;
        const hosts = new Map();
        // TODO zk booster
        const configs = configLoader.dataHosts;

        for (let conf of configs.values()) {
            let pool = this.createPhysicalDbPool(conf);
            hosts.set(pool.hostName, pool);
        }
    
        return hosts;
    }
    
    initDataNodes() {
        const configLoader = this.#configLoader;
        const nodeConfigs = configLoader.dataNodes;
        const dataHosts = this.#configInitializer.dataHosts;
        const nodes = new Map();
        
        for (let conf of nodeConfigs.values()) {
            let dataHost = conf.dataHost;
            let pool = dataHosts.get(dataHost);
            if (!pool) {
                let er = `dataHost '${dataHost}' not existing`; 
                throw new ConfigError(er);
            }

            let name = conf.name;
            let node = new PhysicalDbNode(name, conf.database, pool);
            nodes.set(name, node);
        }
        
        return nodes;
    }

    initHostSchemas() {
        const initializer = this.#configInitializer;
        const dataHosts = initializer.dataHosts;
        const dataNodes = initializer.dataNodes;

        for (let hostPool of dataHosts.values()) {
            let hostName = hostPool.hostName;
            let schemas = [];
            for (let node of dataNodes.values()) {
                let dbPool = node.dbPool;
                if (dbPool.hostName === hostName) {
                    schemas.push(node.database);
                }
            }
            if (schemas.length === 0) {
                let config = hostPool.dataHostConfig;
                if (config.dbType === 'sqlite') {
                    schemas.push("main");
                    schemas.push("temp");
                }
            }
            hostPool.schemas = schemas;
        }
    }

    createPhysicalDbPool(dhConfig) {
        const name = dhConfig.name;
        const dbType = dhConfig.dbType;
        const dbDriver = dhConfig.dbDriver;

        const writeSources = this.createDataSources(dhConfig, name, 
            dbType, dbDriver, dhConfig.writeHosts, false);
        const readSources = new Map();
        for (let [i, dbConf] of dhConfig.readHosts) {
            const sources = this.createDataSources(dhConfig, name,
                dbType, dbDriver, dbConf, true);
            readSources.set(i, sources);
        }

        const pool = new PhysicalDbPool(name, dhConfig, writeSources, 
            readSources, dhConfig.balance, dhConfig.writeType);
        pool.slaveIDs = dhConfig.slaveIDs;
        return pool;
    }

    createDataSources(dhConfig, hostName, dbType, dbDriver, dbConfigs, isRead) {
        const dataSources = [];
        const system = this.#configInitializer.system;

        dbConfigs.forEach(conf => {
            let source;
            conf.idleTimeout = system.idleTimeout;
            switch (dbType) {
                case 'mysql':
                    source = new MysqlDataSource(conf, dhConfig, isRead);
                    break;
                case 'sqlite':
                    source = new SqliteDataSource(conf, dhConfig, isRead);
                    break;
                default:
                    let er = `dbType '${dbType}' of '${hostName}' not supported yet!`;
                    throw new ConfigError(er);
            }
            dataSources.push(source);
        });

        return dataSources;
    }

}

module.exports = ConfigInitializer;
