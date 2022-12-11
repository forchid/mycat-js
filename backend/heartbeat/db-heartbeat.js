const Logger = require("../../util/logger");

class DbHeartbeat {

    #source = null;
    #status = DbHeartbeat.INIT_STATUS;
    #heartbeatSQL = '';
    #maxRetryCount = 0;
    #errorCount = 0;
    #stopped = true;
    #lastSendTime = new Date().getTime();
    #lastRecvTime = this.#lastSendTime;

    constructor(source) {
        this.#source = source;
        let config = source.dhConfig;
        this.#heartbeatSQL = config.heartbeatSQL;
        this.#maxRetryCount = config.maxRetryCount;
    }

    get status() {
        return this.#status;
    }

    get heartbeatSQL() {
        return this.#heartbeatSQL;
    }

    start() {
        if (this.#heartbeatSQL) {
            this.#stopped = false;
        } else {
            let name = this.#source.name;
            Logger.warn("Data source '%s' no heartbeat sql, so skip heartbeat.", name);
            this.stop();
        }
        return this;
    }

    stop() {
        this.#stopped = true;
        return this;
    }

    heartbeat() {
        let source = this.#source;
        if (this.#stopped) {
            Logger.debug("Data source '%s' heartbeat stopped.", source.name);
            return false;
        }

        this.#lastSendTime = new Date().getTime();
        let conn = null;
        try {
            conn = source.createNewConnection();
            conn.borrowed = true;
            conn.execute(this.#heartbeatSQL);
            this.#status = DbHeartbeat.OK_STATUS;
        } catch (e) {
            this.#status = DbHeartbeat.ERROR_STATUS;
            let m = e.stack || e.message;
            Logger.warn("Data source '%s' heartbeat failed - %s", source.name, m);
        } finally {
            if (conn) conn.close();
            this.#lastRecvTime = new Date().getTime();
        }
    }

    static get INIT_STATUS() { return 0; }

    static get OK_STATUS() { return 1; }

	static get ERROR_STATUS() { return -1; }

	static get TIMEOUT_STATUS() { return -2; }
    
}

module.exports = DbHeartbeat;
