const ConnError = require("../../net/conn-error");
const ErrorCode = require("../../net/mysql/error-code");

class PhysicalDbNode {
    
    #name = '';
	#database = '';
	#dbPool = null;

    constructor (name, database, dbPool) {
        this.#name = name;
        this.#database = database;
        this.#dbPool = dbPool;
    }

    get name() {
        return this.#name;
    }

    get database() {
        return this.#database;
    }

    get dbPool() {
        return this.#dbPool;
    }

    getConnection(autoCommit, routeNode) {
        let dbPool = this.dbPool;
        if (!dbPool.initOk) {
            dbPool.init(dbPool.activeIndex);
        }
        let schema = this.database;

        const MycatServer = require("../../mycat-server");
        let config = MycatServer.instance.config;
        let needMaster = !autoCommit && config.strictTxIsolation;
        routeNode.runOnSlave = !needMaster;
        if (!dbPool.initOk) {
            let errno = ErrorCode.ER_CONNECT_TO_MASTER;
            throw new ConnError("Backend db pool init failed", errno);
        }
        // TODO read/write balance
        let source = dbPool.source;
        source.writeCount++;
        return source.getConnection(schema, autoCommit);
    }

}

module.exports = PhysicalDbNode;
