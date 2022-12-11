/**
 * SQL visitor, configuration and execution context.
 * 
 * @author little-pan
 * @since 2022-11-29
 */
class SqlContext {

    static get MYSQL_QUOTES() { return '`'; }

    static get ANSI_QUOTES() { return '"'; }

    static get MSSQL_QUOTES() { return '['; }

    errMaxLen = 100;
    quotes = SqlContext.MYSQL_QUOTES;

    visitSelectStmt(selectStmt) {
        return selectStmt;
    }

    visitIdentifier(identifier) {
        return identifier;
    }

    visitUserVar(userVar) {
        return userVar;
    }

    visitSysVar(sysVar) {
        return sysVar;
    }

    visitLimitClause(clause) {
        return clause;
    }

}

module.exports = SqlContext;
