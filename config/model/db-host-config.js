const PhysicalDBPool = require("../../backend/data-source/physical-db-pool");
const StringHelper = require("../../util/string-helper");
const TypeHelper = require("../../util/type-helper");
const ConfigError = require("../config-error");
const SystemConfig = require("./system-config");

class DbHostConfig {

    #hostName = '';
    #ip = '';
    #port = 0;
    #url = '';
    #user = '';
    #password = '';
    #encryptPassword = '';
    #checkAlive = true;

    #dbType = '';
    #maxCon = 1000;
    #minCon = 10;
    #filters = 'mergeStat';
    #logTime = PhysicalDBPool.LOG_TIME;
    #weight = 0;

    #idleTimeout = SystemConfig.DEFAULT_IDLE_TIMEOUT;

    constructor(hostName, ip, port, url, user, 
        password, encryptPassword, checkAlive) {
        // Check
        StringHelper.ensureNotBlank(hostName, 'db host');
        StringHelper.ensureNotBlank(ip, 'db ip');
        TypeHelper.ensureInteger(port, 'db port');
        if (port < 0) throw new ConfigError(`db port negative: ${port}`);
        StringHelper.ensureNotBlank(url, 'db url');
        TypeHelper.ensureString(user, 'db user');
        TypeHelper.ensureString(password, 'db password');
        TypeHelper.ensureString(encryptPassword, 'encryptPassword');
        TypeHelper.ensureBoolean(checkAlive, 'checkAlive');
        // Init
        this.#hostName = hostName;
        this.#ip = ip;
        this.#port = port;
        this.#url = url;
        this.#user = user;
        this.#password = password;
        this.#encryptPassword = encryptPassword;
        this.#checkAlive = checkAlive;
    }

    get hostName() {  return this.#hostName; }

    get ip() {  return this.#ip; }

    get port() {  return this.#port; }

    get url() {  return this.#url; }

    get user() {  return this.#user; }

    get password() {  return this.#password; }

    get encryptPassword() {  return this.#encryptPassword; }

    get checkAlive() {  return this.#checkAlive; }

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

    get dbType() { return this.#dbType; }

    set dbType(dbType) {
        StringHelper.ensureNotBlank(dbType, 'dbType');
        this.#dbType = dbType;
    }

    get filters() { return this.#filters; }

    set filters(filters) {
        TypeHelper.ensureString(filters, 'filters');
        this.#filters = filters;
    }

    get logTime() { return this.#logTime; }

    set logTime(logTime) {
        let n = TypeHelper.parseIntDecimal(logTime, 'logTime');
        this.#logTime = n;
    }

    get weight() { return this.#weight; }

    set weight(weight) {
        let n = TypeHelper.parseIntDecimal(weight, 'weight');
        this.#weight = n;
    }

    get idleTimeout() {
        return this.#idleTimeout;
    }

    set idleTimeout(timeout) {
        let n = TypeHelper.parseIntDecimal(timeout, 'idleTimeout');
        this.#idleTimeout = n;
    }

    static dbEmbedded(dbType) {
        return ('sqlite' === dbType);
    }

}

module.exports = DbHostConfig;
