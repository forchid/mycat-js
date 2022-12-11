const UnsupportedError = require("../lang/unsupported-error");
const Connection = require("../net/connection");
const Logger = require("../util/logger");

/** The backend connection that wraps a DbConnection.
 * @author little-pan
 * @since 2022-12-08
 */
class BackConnection extends Connection {

    #pool = null;   // A PhysicalDataSource
    #conn = null;   // A db.DbConnection
    #borrowed = false;
    #pooled = false;
    
    /** The current route node. */
    routeNode = null;

    constructor (id, conn, pool) {
        super(id);
        this.#conn = conn;
        this.#pool = pool;
    }

    get pool() {
        return this.#pool;
    }

    get pooled() {
        return this.#pooled;
    }

    set pooled(p) {
        this.#pooled = p;
    }

    get connection() {
        return this.#conn;
    }

    get borrowed() {
        return this.#borrowed;
    }

    set borrowed(b) {
        this.#borrowed = b;
    }

    execute(sql) {
        Logger.debug("Execute sql: %s", sql);
        if (!this.borrowed) {
            let e = `The connection '${this}' has been released!`;
            throw new Error(e);
        }
        return this.#conn.execute(sql);
    }

    rollback() {
        this.#conn.rollback();
    }

    /** Check this connection alive.
     * @returns true if alive, otherwise false
     */
    checkAlive() {
        let conn = this.connection;
        if (this.closed || !conn) {
            return false;
        }

        let poolConfig = this.pool.dbConfig;
        if (poolConfig.checkAlive) {
            let heartbeat = this.pool.heartbeat;
            let sql = heartbeat.heartbeatSQL;
            try {
                conn.execute(sql);
                return true;
            } catch (e) {
                if (Logger.debugEnabled) {
                    let m = e.stack || e.message;
                    Logger.debug("check alive failed by sql '%s': "+ m, sql);
                }
            }
        } else {
            Logger.debug("checkAlive disabled.");
        }

        return false;
    }

    release() {
        this.pool.releaseConn(this);
    }

    close(reason) {
        let conn = this.#conn;
        if (conn) {
            if (!this.autoCommit) {
                try {
                    this.rollback();
                } catch (e) {
                    // Ignore
                }
                this.autoCommit = true;
            }
            this.pool.closeConn(conn);
        }
        this.#conn = null;
        return super.close(reason);
    }
    
}

module.exports = BackConnection;
