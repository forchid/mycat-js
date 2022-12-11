const UnsupportedError = require("../../lang/unsupported-error");
const TypeHelper = require("../../util/type-helper");
const BackConnection = require("../back-connection");
const PhysicalDBPool = require("./physical-db-pool");
const ConnError = require("../../net/conn-error");
const DbHeartbeat = require("../heartbeat/db-heartbeat");

const co = require("coroutine");
const Logger = require("../../util/logger");

class PhysicalDataSource {

    #name = '';
    #size = 10;
    #dbConfig = null;
    #dhConfig = null;
    #readNode = false;

    #dbPool = null;
    #heartbeat = null;
    #connPool = new ConnPool();
    #connCount = 0;
    #activeCount = 0;
    #maxWait = 30000; // Wait max ms when no connection

    readCount = 0;
    writeCount = 0;

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

    get connCount() {
        return this.#connCount;
    }

    get activeCount() {
        return this.#activeCount;
    }

    get heartbeat() {
        return this.#heartbeat;
    }

    startHeartbeat() {
        this.heartbeat.start();
    }

    doHeartbeat() {
        Logger.debug("DataSource '%s' heartbeat ..", this.name);
        this.heartbeat.heartbeat();
        Logger.debug("DataSource '%s' alive? %s.", this.name, this.alive);
    }

    get alive() {
        return (this.heartbeat.status == DbHeartbeat.OK_STATUS);
    }

    createHeartbeat() {
        return new DbHeartbeat(this);
    }

    getConnection(schema, autoCommit) {
        const name = this.name;
        let conn = this.#connPool.getConn(schema, autoCommit);

        if (conn) {
            conn.borrowed = true;
            conn.lastReadTime = new Date().getTime();
            if (conn.schema != schema) {
                conn.schema = schema;
            }
            let q = this.#connPool.getConnQueue(schema);
            q.executeCount++;
            let total = this.#connCount;
            let active = ++this.#activeCount;
            Logger.debug("DataSource '%s' lent '%s': total %s, active %s.", 
                name, conn, total, active);
            return conn;
        } else {
            if (this.connCount >= this.size) {
                let cur = new Date().getTime();
                const end = cur + this.#maxWait;
                do {
                    // No interrupted timeout method in current fibJS
                    co.sleep(100);
                    cur = new Date().getTime();
                    if (cur > end) {
                        throw new ConnError();
                    }
                } while (this.connCount >= this.size);
            }

            let failed = true;
            try {
                let total = ++this.#connCount;
                let active = ++this.#activeCount;
                conn = this.createNewConnection(schema);
                conn.pooled = true;
                conn.borrowed = true;
                let initSql = this.dhConfig.connectionInitSql;
                if (initSql) conn.execute(initSql);
                Logger.debug("DataSource '%s' created '%s': total %s, active %s.", 
                    name, conn, total, active);
                failed = false;
            } finally {
                if (failed) {
                    this.#activeCount--;
                    this.#connCount--;
                }
            }

            return conn;
        }
    }

    createNewConnection(schema) {
        throw new UnsupportedError('createNewConnection() not impl');
    }

    releaseConn(conn) {
        if (conn instanceof BackConnection) {
            let schema = conn.schema;
            let q = this.#connPool.getConnQueue(schema);
            conn.lastReadTime = new Date().getTime();
            conn.borrowed = false;
            if (conn.autoCommit) q.autoCommits.push(conn);
            else q.manCommits.push(conn);
            let active = --this.#activeCount;
            Logger.debug("DataSource '%s' released '%s': total %s, active %s.", 
                this.name, conn, this.#connCount, active);
            return true;
        } else {
            return false;
        }
    }

    closeConn(conn) {
        if (conn instanceof BackConnection) {
            try {
                if (!conn.closed && conn.pooled) {
                    this.#connCount--;
                    this.#activeCount--;
                    conn.pooled = false;
                    return true;
                }
            } finally {
                conn.close();
            }
        }
        
        return false;
    }
}

class ConnQueue {

    #autoCommits = [];
    #manCommits = [];

    executeCount = 0;

    get autoCommits() {
        return this.#autoCommits;
    }

    get manCommits() {
        return this.#manCommits;
    }

    getConn(autoCommit) {
        let qa = this.#autoCommits;
        let qb = this.#manCommits;

        if (!autoCommit) {
            qa = this.#manCommits;
            qb = this.#autoCommits;
        }

        let c = qa.shift();
        for (; c && !c.checkAlive();) {
            c.close();
            c = qa.shift();
        }
        if (c) return c;

        c = qb.shift();
        for (; c && !c.checkAlive();) {
            c.close();
            c = qb.shift();
        }
        return (c || null);
    }

    removeConn(conn) {
        let q = this.#autoCommits;
        let i = q.indexOf(conn);

        if (i == -1) {
            q = this.#manCommits;
            i = q.indexOf(conn);
        }

        if (q == -1) {
            return false;
        } else {
            q.splice(i, 1);
            return true;
        }
    }

}

class ConnPool {

    // schema -> connQueue
    #pool = new Map();

    get allConnQueues() {
        return this.#pool;
    }

    get executeCount() {
        let qs = this.allConnQueues.values();
        let n = 0;
        for (let q of qs) {
            n += q.executeCount;
        }
        return n;
    }

    getConnQueue(schema) {
        let name = schema.toUpperCase();
        let q = this.#pool.get(name);
        if (!q) {
            q = new ConnQueue();
            this.#pool.set(name, q);
        }
        return q;
    }

    getConn(schema, autoCommit) {
        const q = this.getConnQueue(schema);
        let c = q.getConn(autoCommit);

        if (c) {
            return c;
        }

        for (let a of this.#pool.values()) {
            if (a != q) {
                c = a.getConn(autoCommit);
                if (c) {
                    return c;
                }
            }
        }

        return null;
    }

}

module.exports = PhysicalDataSource;
