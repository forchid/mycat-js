const MultiNodeHandler = require("../../backend/handler/multi-node-handler");
const SingleNodeHandler = require("../../backend/handler/single-node-handler");
const Handler = require("../../handler");
const MycatServer = require("../../mycat-server");
const ConnError = require("../../net/conn-error");
const MycatSqlContext = require("../mycat-sql-context");
const MysqlParser = require("../../sql/parser/mysql-parser");
const SqlError = require("../../sql/sql-error");
const Logger = require("../../util/logger");
const ErrorCode = require("../../net/mysql/error-code");

class FrontQueryHandler extends Handler {

    #snHandler = new SingleNodeHandler();
    #mnHandler = new MultiNodeHandler();
    #parser = new MysqlParser();
    #sqlCtx = null;

    invoke(sqlQuery) {
        let { sql, source } = sqlQuery;

        Logger.debug("SQL query: %s", sql);
        if (!sql) {
            let errno = ErrorCode.ER_NOT_ALLOWED_COMMAND;
            this.sendError(source, sqlQuery, errno);
            return;
        }

        let dbName = source.schema;
        if (!dbName) {
            this.sendError(source, sqlQuery, ErrorCode.ER_NO_DB_ERROR);
            return;
        }
        let server = MycatServer.instance;
        let schemaConfig = server.config.getSchema(dbName);
        if (!schemaConfig) {
            this.sendError(source, sqlQuery, ErrorCode.ER_BAD_DB_ERROR);
            return;
        }
        
        let sqlCtx = this.#sqlCtx;
        if (sqlCtx === null) {
            sqlCtx = this.#sqlCtx = new MycatSqlContext(source);
        }
        let stmts;
        try { 
            stmts = this.#parser.parse(sql, sqlCtx);
        } catch (e) {
            if (e instanceof SqlError) {
                let m = e.message;
                this.sendError(source, sqlQuery, ErrorCode.ER_PARSE_ERROR, m);
                return;
            } else {
                throw e;
            }
        }

        let multi = stmts instanceof Array;
        if (multi && stmts.length === 0) {
            let errno = ErrorCode.ER_EMPTY_QUERY;
            this.sendError(source, sqlQuery, errno);
            return;
        }

        try {
            if (multi) {
                for (let stmt of stmts) {
                    this.query(stmt, source, server, schemaConfig);
                }
            } else {
                this.query(stmts, source, server, schemaConfig);
            }
        } catch (e) {
            if (e instanceof ConnError) {
                source.sendError(1, e.errno, e.message);
                return;
            } else {
                throw e;
            }
        }
    }

    query(stmt, source, server, schConfig) {
        let router = server.routeService;
        let charset = source.charset;
        let sysConfig = server.system;
        let route = router.route(stmt, charset, source, sysConfig, schConfig);
        let routedQuery = { route, source };

        let nodeHandler;
        if (route.nodeCount > 1) nodeHandler = this.#mnHandler;
        else nodeHandler = this.#snHandler;
        nodeHandler.invoke(routedQuery);
    }

    sendError(source, sqlQuery, errno, message) {
        let seq = sqlQuery.seq + 1;
        source.sendError(seq, errno, message);
    }

}

module.exports = FrontQueryHandler;
