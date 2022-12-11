const ConfigInitializer = require("./config-initializer");
const co = require('coroutine');

/**
 * The whole MyCat config resources, includes all configurations of schemas, 
 * users, system, and underlying data sources such data host or node etc. Also
 * it can reload the whole configuration for supporting hot deployment.
 */
class MycatConfig {

    static #RELOAD = 1;
    static #ROLLBACK = 2;
    static #RELOAD_ALL = 3;

    #backup = null; // A instance of MycatConfig for rollback

    #schemas = null;
	#users = null;
    #system = null;
              
	#dataNodes = null;
	#dataHosts = null;

    #cluster = null;
	#firewall = null;

	#reloadTime = new Date().getTime();
	#rollbackTime = -1;
	#status = MycatConfig.#RELOAD;
	#lock = new co.Lock();
    // TODO reload, rollback

    constructor(init) {
        if (init === false) {
            return;
        }

        let loadDataHost = true;
        let initializer = new ConfigInitializer({ loadDataHost });

        this.#schemas = initializer.schemas;
        this.#users = initializer.users;
        this.#system = initializer.system;
        this.#dataNodes = initializer.dataNodes;
        this.#dataHosts = initializer.dataHosts;
        this.#cluster = initializer.cluster;
        this.#firewall = initializer.firewall;
    }

    get schemas() {
        return this.#schemas;
    }

    get users() {
        return this.#users;
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

    get firewall() {
        return this.#firewall;
    }

    get cluster() {
        return this.#cluster;
    }

    get lock() {
        return this.#lock;
    }
    
    get canRollback() {
        let rb = MycatConfig.#ROLLBACK;
        return (this.#backup && this.#status != rb);
    }

    getSchema(name) {
        name = name.toUpperCase();
        return this.#schemas.get(name);
    }

    copy() {
        let copy = new MycatConfig(false);
        copy.#schemas = this.schemas;
        copy.#users = this.users;
        copy.#system = this.system;
        copy.#dataHosts = this.dataHosts;
        copy.#dataNodes = this.dataNodes;
        copy.#cluster = this.cluster;
        copy.#firewall = this.firewall;
        
        return copy;
    }

}

module.exports = MycatConfig;
