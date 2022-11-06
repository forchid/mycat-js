const PhysicalDBPool = require("../../../backend/datasource/physical-db-pool");
const SystemConfig = require("../../system-config");

class DataHostConfig {

    static #HB_SLV_SQL_PATTERN = /\s*show\s+slave\s+status\s*/i;
    static #HB_CLS_SQL_PATTERN = /\s*show\s+status\s+like\s+'wsrep%'/i;

    #name;
    #dbType;
    #dbDriver;
    #switchType;
    #slaveThreshold;
    #tempReadHostAvailable;
    #isShowSlaveSql = false;
    #isShowClusterSql = false;
    #heartbeatSQL = null;
    #writeHosts;
    #readHosts;

    maxCon = SystemConfig.DEFAULT_POOL_SIZE;
    minCon = 10;
    balance = PhysicalDBPool.BALANCE_NONE;
    balanceType = PhysicalDBPool.RANDOM;
    writeType = PhysicalDBPool.WRITE_ONLYONE_NODE;
    connectionInitSql = null;
    filters = 'mergeStat';
    logTime = PhysicalDBPool.LOG_TIME;
    slaveIDs = null;
    notSwitch = DataHostConfig.CAN_SWITCH_DS;
    maxRetryCount = 3;

    constructor(name, dbType, dbDriver, writeHosts, readHosts, 
        switchType, slaveThreshold, tempReadHostAvailable) {
        this.#name = name;
        this.#dbType = dbType;
        this.#dbDriver = dbDriver;
        this.#writeHosts = writeHosts;
        this.#readHosts = readHosts;
        this.#switchType = switchType;
        this.#slaveThreshold = slaveThreshold;
        this.#tempReadHostAvailable = tempReadHostAvailable;
    }

    get name() {
        return this.#name;
    }

    get dbType() {
        return this.#dbType;
    }

    get dbDriver() {
        return this.#dbDriver;
    }

    get writeHosts() {
        return this.#writeHosts;
    }

    get readHosts() {
        return this.#readHosts;
    }

    get switchType() {
        return this.#switchType;
    }

    get slaveThreshold() {
        return this.#slaveThreshold;
    }

    get tempReadHostAvailable() {
        return this.#tempReadHostAvailable;
    }

    get isShowSlaveSql() {
        return this.#isShowSlaveSql;
    }

    get isShowClusterSql() {
        return this.#isShowClusterSql;
    }

    get heartbeatSQL() {
        return this.#heartbeatSQL;
    }

    set heartbeatSQL(heartbeatSQL) {
        this.#heartbeatSQL = heartbeatSQL;
        let find = DataHostConfig.#HB_SLV_SQL_PATTERN.test(heartbeatSQL);
        if (find) this.#isShowSlaveSql = true;

        find = DataHostConfig.#HB_CLS_SQL_PATTERN.test(heartbeatSQL);
        if (find) this.#isShowClusterSql = true;
    }

    static get CAN_SWITCH_DS() {
        return '0';
    }
}

module.exports = DataHostConfig;
