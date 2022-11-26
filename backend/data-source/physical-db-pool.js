const Logger = require("../../util/logger");
const LeastActiveLoadBalance = require("../load-balance/least-active-load-balance");
const RandomLoadBalance = require("../load-balance/random-load-balance");
const WeightedRrLoadBalance = require("../load-balance/weighted-rr-load-balance");

class PhysicalDbPool {

    #hostName = '';
    #dataHostConfig = null;
    #writeSources = [];
    #readSources = new Map();
    #balance = 0;
    #writeType = 0;

    #schemas = [];
    #slaveIDs = '';
    #loadBalance = null;
    #allSources = [];

    constructor (name, dataHostConfig, writeSources, readSources, 
        balance, writeType) {
        this.#hostName = name;
        this.#dataHostConfig = dataHostConfig;
        this.#writeSources = writeSources;
        this.#readSources = readSources;
        this.#balance = balance;
        this.#writeType = writeType;

        let balanceType = dataHostConfig.balanceType;
        switch (balanceType) {
            case PhysicalDbPool.WEIGHTED_ROUND_ROBIN:
                this.#loadBalance = new WeightedRrLoadBalance();
                break;
            case PhysicalDbPool.LEAST_ACTIVE:
                this.#loadBalance = new LeastActiveLoadBalance();
                break;
            default:
                this.#loadBalance = new RandomLoadBalance();
                break;
        }

        this.#allSources = this.generateAllSources();
        this.#allSources.forEach(source => source.dbPool = this);
        let n = this.#allSources.length;
        Logger.info(`Total data sources of the data host '%s' is %s.`, name, n);
    }

    get hostName() {
        return this.#hostName;
    }

    get slaveIDs() {
        return this.#slaveIDs;
    }

    set slaveIDs(slaveIDs) {
        this.#slaveIDs = slaveIDs;
    }

    get balance() {
        return this.#balance;
    }

    get schemas() {
        return this.#schemas;
    }

    set schemas(schemas) {
        this.#schemas = schemas;
    }

    generateAllSources() {
        const all = [ ... this.#writeSources ];

        for (let sources of this.#readSources.values()) {
            sources.forEach(source => all.push(source));
        }

        return all;
    }

    // Class level properties
    static get RANDOM() {
        return 0;
    }

    static get WEIGHTED_ROUND_ROBIN() {
        return 1;
    }

    static get LEAST_ACTIVE() {
        return 2;
    }

    /** The load balance: all read operations only dispatched to 
     * all available writeHosts(read/write splitting off). */
    static get BALANCE_NONE() {
        return 0;
    }

    /** The load balance: all read operations can be dispatched to 
     * all readHosts and stand-by writeHosts(read/write splitting on). */
    static get BALANCE_ALL_BACK() {
        return 1;
    }

    /** The load balance: read operations can be dispatched to 
     * readHosts and writeHosts randomly(read/write splitting on). */
    static get BALANCE_ALL() {
        return 2;
    }

    /** The load balance: all read operations only be dispatched to 
     * readHosts randomly(read/write splitting on). */
    static get BALANCE_ALL_READ() {
        return 3;
    }

    static get RANDOM() {
        return 0;
    }

    /** The write type: all write operations only dispatched to 
     * the current writeHost. */
    static get WRITE_ONLY_ONE_NODE() {
        return 0;
    }

    /** The write type: write operations randomly dispatched to 
     * a writeHost. */
    static get WRITE_RANDOM_NODE() {
        return 1;
    }

    static get LOG_TIME() {
        return 300000;
    }

    static get WEIGHT() {
        return 0;
    }
}

module.exports = PhysicalDbPool;
