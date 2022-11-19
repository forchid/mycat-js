const UnsupportedError = require("../../lang/unsupported-error");
const TypeHelper = require("../../util/type-helper");
const PhysicalDBPool = require("./physical-db-pool");

class PhysicalDataSource {

    #name = '';
    #size = 10;
    #dbConfig = null;
    #dhConfig = null;
    #readNode = false;

    #dbPool = null;
    #heartbeat = null;

    constructor (dbConfig, dhConfig, readNode) {
        this.#dbConfig = dbConfig;
        this.#dhConfig = dhConfig;
        this.#readNode = readNode;

        this.#name = dbConfig.hostName;
        this.#size = dbConfig.maxCon;
        this.#heartbeat = this.createHeartbeat();
    }

    get name() {
        return this.#name;
    }

    get size() {
        return this.#size;
    }

    get dbConfig() {
        return this.#dbConfig;
    }

    get dhConfig() {
        return this.#dhConfig;
    }

    get readNode() {
        return this.#readNode;
    }

    get dbPool() {
        return this.#dbPool;
    }

    set dbPool(dbPool) {
        TypeHelper.ensureInstanceof(dbPool, PhysicalDBPool, 'dbPool');
        this.#dbPool = dbPool;
    }

    createHeartbeat() {
        throw new UnsupportedError('createHeartbeat() not impl');
    }

    createNewConnection(schema) {
        throw new UnsupportedError('createNewConnection() not impl');
    }

}

module.exports = PhysicalDataSource;
