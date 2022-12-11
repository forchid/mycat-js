const Logger = require("../../util/logger");
const LeastActiveLoadBalance = require("../load-balance/least-active-load-balance");
const RandomLoadBalance = require("../load-balance/random-load-balance");
const WeightedRrLoadBalance = require("../load-balance/weighted-rr-load-balance");
const crypto = require("crypto");

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

    #initOk = false;
    #activeIndex = 0;

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

    get dataHostConfig() {
        return this.#dataHostConfig;
    }

    get writeType() {
        return this.#writeType;
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

    get initOk() {
        return this.#initOk;
    }

    get activeIndex() {
        return this.#activeIndex;
    }

    /** Query an appropriate write source by writeType. */
    get source() {
        const sources = this.#writeSources;
        switch (this.writeType) {
            case PhysicalDbPool.WRITE_ONLY_ONE_NODE:
                return sources[this.#activeIndex];
            case PhysicalDbPool.WRITE_RANDOM_NODE:
                let n = sources.length;
                let index = Math.abs(crypto.randomBytes(1).readUInt8() % n);
                let source = sources[index];
                if (source.alive) {
                    return source;
                }
                let aliveList = [];
                sources.forEach((s, i) => {
                    if (i != index && source.alive) {
                        aliveList.push(s);
                    }
                });
                n = aliveList.length;
                if (n == 0) {
                    return sources[0];
                }
                index = Math.abs(crypto.randomBytes(1).readUInt8() % n);
                return aliveList[index];
            default:
                throw new Error(`Unknown writeType ${this.writeType}!`);
        }
    }

    startHeartbeat() {
        for (let source of this.#allSources) {
            source.startHeartbeat();
        }
    }

    doHeartbeat() {
        Logger.debug("DbPool '%s' heartbeat start ..", this.hostName);
        for (let source of this.#allSources) {
            source.doHeartbeat();
        }
        Logger.debug("DbPool '%s' heartbeat end.", this.hostName);
    }

    checkIndex(index) {
        let sources = this.#writeSources;
        return (index >= 0 && index < sources.length);
    }

    nextIndex(index) {
        return (++index % this.#writeSources.length);
    }

    init(index) {
        const name = this.hostName;
        const schemas = this.schemas;
        if (schemas.length === 0) {
            Logger.warn("DbPool '%s' no dataNode, so skip init.", name);
            return;
        }
        if (!this.checkIndex(index)) {
            let e = `WriteSource index ${index} out of range.`;
            throw new RangeError(e);
        }

        let source = this.#writeSources[index];
        let initSize = source.dbConfig.minCon;
        let ok = false;
        for (let i = 0; i < initSize; ++i) {
            let schema = schemas[i % schemas.length];
            try {
                let conn = source.getConnection(schema, true);
                conn.release();
                ok = true;
                Logger.debug("DbPool '%s' init a conn of schema '%s' OK.", name, schema);
            } catch (e) {
                let m = e.stack || e.message;
                let f = "DbPool '%s' init a conn of schema '%s' failed - %s";
                Logger.warn(f, name, schema, m);
            }
        }
        
        if (this.#initOk = ok) {
            this.#activeIndex = index;
            if (this.writeType == PhysicalDbPool.WRITE_ONLY_ONE_NODE) {
                const MycatServer = require("../../mycat-server");
                MycatServer.instance.saveDataHostIndex(name, index);
            }
        }
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
