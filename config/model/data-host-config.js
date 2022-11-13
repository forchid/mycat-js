const PhysicalDBPool = require("../../backend/data-source/physical-db-pool");
const StringHelper = require('../../util/string-helper');
const TypeHelper = require("../../util/type-helper");
const ConfigError = require("../config-error");
const SystemConfig = require("./system-config");

class DataHostConfig {

    static #HB_SLV_SQL_PATTERN = /\s*show\s+slave\s+status\s*/i;
    static #HB_CLS_SQL_PATTERN = /\s*show\s+status\s+like\s+'wsrep%'/i;

    #name = '';
    #dbType = '';
    #dbDriver = '';
    #switchType = DataHostConfig.DEFAULT_SWITCH_DS;
    #slaveThreshold = -1; // default never read from slave
    #tempReadHostAvailable = false;
    #isShowSlaveSql = false;
    #isShowClusterSql = false;
    #heartbeatSQL = '';
    #writeHosts = [];
    #readHosts = new Map();
    #dataNodes = new Set();

    #maxCon = SystemConfig.DEFAULT_POOL_SIZE;
    #minCon = 10;
    #balance = PhysicalDBPool.BALANCE_NONE;
    #balanceType = PhysicalDBPool.RANDOM;
    #writeType = PhysicalDBPool.WRITE_ONLYONE_NODE;
    #connectionInitSql = '';
    #filters = 'mergeStat';
    #logTime = PhysicalDBPool.LOG_TIME;
    #slaveIDs = '';
    notSwitch = DataHostConfig.CAN_SWITCH_DS;
    #maxRetryCount = 3;

    constructor(name, dbType, dbDriver, writeHosts, readHosts, 
        switchType, slaveThreshold, tempReadHostAvailable) {
        // Check
        StringHelper.ensureNotBlank(name, 'dataHost name');
        StringHelper.ensureNotBlank(dbType, 'dataHost dbType');
        StringHelper.ensureNotBlank(dbDriver, 'dataHost dbDriver');
        TypeHelper.ensureInstanceof(writeHosts, Array, 'writeHosts');
        TypeHelper.ensureInstanceof(readHosts, Map, 'readHosts');
        TypeHelper.ensureInteger(switchType, 'dataHost switchType');
        if (switchType < DataHostConfig.NOT_SWITCH_DS 
            || switchType > DataHostConfig.CLUSTER_STATUS_SWITCH_DS) {
            let er = `switchType ${switchType} in dataHost '${name}' unknown!`;
            throw new ConfigError(er);
        }
        TypeHelper.ensureInteger(slaveThreshold, 'dataHost slaveThreshold');
        TypeHelper.ensureBoolean(tempReadHostAvailable, 'tempReadHostAvailable');
        
        // Init
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

    /**
     * The write data source switch type, can be the one of not auto switch,
     * auto switch(default), switch by master/slave sync status, or switch by 
     * cluster status.
     */
    get switchType() {
        return this.#switchType;
    }

    /**
     * A decision condition of reading from the salve. MyCat can read from this slave 
     * if the time that the slave behinds master < this threshold.
     */
    get slaveThreshold() {
        return this.#slaveThreshold;
    }

    get maxCon() { return this.#maxCon; }

    set maxCon(maxCon) {
        let n = TypeHelper.parseIntDecimal(maxCon, 'maxCon');
        if (n < 0) throw new ConfigError(`maxCon negative: ${maxCon}`);
        this.#maxCon = n;
    }

    get minCon() { return this.#minCon; }

    set minCon(minCon) {
        let n = TypeHelper.parseIntDecimal(minCon, 'minCon');
        if (n < 0) throw new ConfigError(`minCon negative: ${minCon}`);
        this.#minCon = n;
    }

    get balance() { return this.#balance; }

    set balance(balance) {
        let n = TypeHelper.parseIntDecimal(balance, 'balance');
        if (n < PhysicalDBPool.BALANCE_NONE 
            || n > PhysicalDBPool.BALANCE_ALL_READ) {
            throw new ConfigError(`balance ${balance} unknown!`);
        }
        this.#balance = n;
    }

    get balanceType() { return this.#balanceType; }

    set balanceType(balanceType) {
        let n = TypeHelper.parseIntDecimal(balanceType, 'balanceType');
        this.#balanceType = n;
    }

    get writeType() { return this.#writeType; }

    set writeType(writeType) {
        let n = TypeHelper.parseIntDecimal(writeType, 'writeType');
        if (n < PhysicalDBPool.WRITE_ONLYONE_NODE 
            || n > PhysicalDBPool.WRITE_RANDOM_NODE) {
            throw new ConfigError(`writeType ${writeType} unknown!`);
        }
        this.#writeType = n;
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
        TypeHelper.ensureString(heartbeatSQL, 'heartbeatSQL');
        this.#heartbeatSQL = heartbeatSQL;
        let find = DataHostConfig.#HB_SLV_SQL_PATTERN.test(heartbeatSQL);
        if (find) this.#isShowSlaveSql = true;

        find = DataHostConfig.#HB_CLS_SQL_PATTERN.test(heartbeatSQL);
        if (find) this.#isShowClusterSql = true;
    }

    get connectionInitSql() {
        return this.#connectionInitSql;
    }

    set connectionInitSql(connectionInitSql) {
        TypeHelper.ensureString(connectionInitSql, 'connectionInitSql');
        this.#connectionInitSql = connectionInitSql;
    }

    get filters() {
        return this.#filters;
    }

    set filters(filters) {
        TypeHelper.ensureString(filters, 'filters');
        this.#filters = filters;
    }

    get slaveIDs() {
        return this.#slaveIDs;
    }

    set slaveIDs(slaveIDs) {
        TypeHelper.ensureString(slaveIDs, 'slaveIDs');
        this.#slaveIDs = slaveIDs;
    }

    addDataNode(nodeName) {
        StringHelper.ensureNotBlank(nodeName, 'nodeName');
        this.#dataNodes.add(nodeName);
    }

    get logTime() {
        return this.#logTime;
    }

    set logTime(logTime) {
        TypeHelper.ensureInteger(logTime, 'logTime');
        this.#logTime = logTime;
    }

    get maxRetryCount() {
        return this.#maxRetryCount;
    }

    set maxRetryCount(maxRetryCount) {
        TypeHelper.ensureInteger(maxRetryCount, 'maxRetryCount');
        this.#maxRetryCount = maxRetryCount;
    }

    /** A switchType value: not auto switch write source. */
    static get NOT_SWITCH_DS() { return -1; }

    /** The default switchType value: auto switch write source. */
    static get DEFAULT_SWITCH_DS() { return 1; }

    /** A switchType value: switch write source by master/slave sync status.
     * eg. MySQL master/slave backend.
     */
    static get SYN_STATUS_SWITCH_DS() { return 2; }

    /** A switchType value: switch write source by cluster status.
     * This switch type applies to multi-master clusters such as MySQL Galera.
     */
    static get CLUSTER_STATUS_SWITCH_DS() { return 3; }

    static get CAN_SWITCH_DS() {
        return '0';
    }
}

module.exports = DataHostConfig;
