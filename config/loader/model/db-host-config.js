const PhysicalDBPool = require("../../../backend/datasource/physical-db-pool");

class DBHostConfig {

    #hostName;
    #ip;
    #port;
    #url;
    #user;
    #password;
    #encryptPassword;
    #checkAlive;

    dbType = null;
    maxCon = 0;
    minCon = 0;
    filters = 'mergeStat';
    logTime = PhysicalDBPool.LOG_TIME;
    weight = 0;

    constructor(hostName, ip, port, url, user, 
        password, encryptPassword, checkAlive) {
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

}

module.exports = DBHostConfig;
