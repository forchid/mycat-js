const SelectStatement = require("../dml/select-statement");
const LimitClause = require("../dml/limit-clause");
const SysVarExpr = require("../expr/sys-var-expr");
const UserVarExpr = require("../expr/user-var-expr");
const Identifier = require("../identifier");
const SqlError = require("../sql-error");
const SqlName = require("../sql-name");
const SqlComment = require("../sql-comment");
const SqlObject = require("../sql-object");
const SqlLexer = require("./sql-lexer");
const SqlToken = require("./sql-token");

/**
 * Mysql/MariaDB SQL parser based on recursive descent parsing, refs 
 * the mariadb docs https://mariadb.com/kb/en/sql-statements-structure.
 * 
 * @author little-pan
 * @since 2022-11-28
 */
class MysqlParser {

    #helper = new ParseHelper();

    constructor (context) {
        if (context) {
            this.#helper.lexer.ctx = context;
        }
    }

    get sql() {
        return this.#helper.lexer.sql;
    }

    get context() {
        return this.#helper.lexer.ctx;
    }

    /** Parse the sql text to sql statements.
     * 
     * @param sql the sql text
     * @param context the sql config
     * @returns a sql statement, or an array of sql statements
     */
    parse(sql, context) {
        return this.#helper.parse(sql, context);
    }

}

class ParseHelper {

    static #RESERVED = { // Reserved words in mariadb 10.6
        ACCESSIBLE:1, ADD:1, ALL:1, ALTER:1, ANALYZE:1, AND:1, AS:1, ASC:1, 
        ASENSITIVE:1, BEFORE:1, BETWEEN:1, BIGINT:1, BINARY:1, BLOB:1, BOTH:1, BY:1,
        CALL:1, CASCADE:1, CASE:1, CHANGE:1, CHAR:1, CHARACTER:1, CHECK:1, COLLATE:1,
        COLUMN:1, CONDITION:1, CONSTRAINT:1, CONTINUE:1, CONVERT:1, CREATE:1, CROSS:1, 
        CURRENT_DATE:1, CURRENT_ROLE:1, CURRENT_TIME:1, CURRENT_TIMESTAMP:1, CURRENT_USER:1, CURSOR:1, DATABASE:1, DATABASES:1, 
        DAY_HOUR:1, DAY_MICROSECOND:1, DAY_MINUTE:1, DAY_SECOND:1, DEC:1, DECIMAL:1, DECLARE:1, DEFAULT:1, 
        DELAYED:1, DELETE:1, DELETE_DOMAIN_ID:1, DESC:1, DESCRIBE:1, DETERMINISTIC:1, DISTINCT:1, DISTINCTROW:1, 
        DIV:1, DO_DOMAIN_IDS:1, DOUBLE:1, DROP:1, DUAL:1, EACH:1, ELSE:1, ELSEIF:1, 
        ENCLOSED:1, ESCAPED:1, EXCEPT/*MariaDB 10.3.0*/:1, EXISTS:1, EXIT:1, EXPLAIN:1, FALSE:1, FETCH:1, 
        FLOAT:1, FLOAT4:1, FLOAT8:1, FOR:1, FORCE:1, FOREIGN:1, FROM:1, FULLTEXT:1, 
        GENERAL:1, GRANT:1, GROUP:1, HAVING:1, HIGH_PRIORITY:1, HOUR_MICROSECOND:1, HOUR_MINUTE:1, HOUR_SECOND:1, 
        IF:1, IGNORE:1, IGNORE_DOMAIN_IDS:1, IGNORE_SERVER_IDS:1, IN:1, INDEX:1, INFILE:1, INNER:1, 
        INOUT:1, INSENSITIVE:1, INSERT:1, INT:1, INT1:1, INT2:1, INT3:1, INT4:1, 
        INT8:1, INTEGER:1, INTERSECT/*MariaDB 10.3.0*/:1, INTERVAL:1, INTO:1, IS:1, ITERATE:1, JOIN:1, 
        KEY:1, KEYS:1, KILL:1, LEADING:1, LEAVE:1, LEFT:1, LIKE:1, LIMIT:1, 
        LINEAR:1, LINES:1, LOAD:1, LOCALTIME:1, LOCALTIMESTAMP:1, LOCK:1, LONG:1, LONGBLOB:1, 
        LONGTEXT:1, LOOP:1, LOW_PRIORITY:1, MASTER_HEARTBEAT_PERIOD:1, MASTER_SSL_VERIFY_SERVER_CERT:1,MATCH:1, MAXVALUE:1, MEDIUMBLOB:1,
        MEDIUMINT:1, MEDIUMTEXT:1, MIDDLEINT:1, MINUTE_MICROSECOND:1, MINUTE_SECOND:1, MOD:1, MODIFIES:1, NATURAL:1, 
        NOT:1, NO_WRITE_TO_BINLOG:1, NULL:1, NUMERIC:1, OFFSET/*MariaDB 10.6.0*/:1, ON:1, OPTIMIZE:1, OPTION:1, 
        OPTIONALLY:1, OR:1, ORDER:1, OUT:1, OUTER:1, OUTFILE:1, OVER:1, PAGE_CHECKSUM:1, 
        PARSE_VCOL_EXPR:1, PARTITION:1, POSITION:1, PRECISION:1, PRIMARY:1, PROCEDURE:1, PURGE:1, RANGE:1, 
        READ:1, READS:1, READ_WRITE:1, REAL:1, RECURSIVE:1, REF_SYSTEM_ID:1, REFERENCES:1, REGEXP:1, 
        RELEASE:1, RENAME:1, REPEAT:1, REPLACE:1, REQUIRE:1, RESIGNAL:1, RESTRICT:1, RETURN:1, 
        RETURNING:1, REVOKE:1, RIGHT:1, RLIKE:1, ROWS:1, SCHEMA:1, SCHEMAS:1, SECOND_MICROSECOND:1, 
        SELECT:1, SENSITIVE:1, SEPARATOR:1, SET:1, SHOW:1, SIGNAL:1, SLOW:1, SMALLINT:1, 
        SPATIAL:1, SPECIFIC:1, SQL:1, SQLEXCEPTION:1, SQLSTATE:1, SQLWARNING:1, SQL_BIG_RESULT:1, SQL_CALC_FOUND_ROWS:1, 
        SQL_SMALL_RESULT:1, SSL:1, STARTING:1, STATS_AUTO_RECALC:1, STATS_PERSISTENT:1, STATS_SAMPLE_PAGES:1, STRAIGHT_JOIN:1, TABLE:1, 
        TERMINATED:1, THEN:1, TINYBLOB:1, TINYINT:1, TINYTEXT:1, TO:1, TRAILING:1, TRIGGER:1, 
        TRUE:1, UNDO:1, UNION:1, UNIQUE:1, UNLOCK:1, UNSIGNED:1, UPDATE:1, USAGE:1, 
        USE:1, USING:1, UTC_DATE:1, UTC_TIME:1, UTC_TIMESTAMP:1, VALUES:1, VARBINARY:1, VARCHAR:1, 
        VARCHARACTER:1, VARYING:1, WHEN:1, WHERE:1, WHILE:1, WINDOW/*disallowed for table aliases*/:1, WITH:1, WRITE:1, 
        XOR:1, YEAR_MONTH:1, ZEROFILL:1
    };

    reserved = ParseHelper.#RESERVED;
    lexer = new SqlLexer();

    parse(sql, ctx) {
        const stmts = [];
        const lexer = this.lexer;
        lexer.reset(sql, ctx);
        
        // Parse statements
        for (;;) {
            let stmt;
            // Handle comment or blank
            let comments = [];
            let type, f = true;
            for (; f; ) {
                type = lexer.nexToken();
                switch (type) {
                    case SqlToken.COMMENT:
                        let c = new SqlComment(lexer.sql, 
                            lexer.start, lexer.end, lexer.prefix);
                        c.context = lexer.ctx;
                        comments.push(c);
                    case SqlToken.BLANK:
                        break;
                    default:
                        f = false;
                        break;
                }
            }
            if (type == SqlToken.EOS || 
                lexer.eos && lexer.prefix == ';') {
                break; // exit
            }
    
            // Parse statement
            if (type != SqlToken.ID || lexer.quoted) {
                throw lexer.getError();
            }
            
            let start = lexer.start;
            let command = lexer.slice();
            switch (command) {
                case "SELECT":
                    lexer.skipBlankComment();
                    stmt = this.parseSelect(start);
                    break;
                default:
                    throw lexer.getError();
            }
    
            // Append comment
            if (stmt && stmt.addComment) {
                stmt.addComment(comments);
            }
            stmts.push(stmt);
        }

        return (stmts.length == 1? stmts[0]: stmts);
    }

    parseSavePoint() {
        throw new SqlError("Not impl");
    }

    parseSet() {
        throw new SqlError("Not impl");
    }

    parseShow() {
        throw new SqlError("Not impl");
    }

    parseStart() {
        throw new SqlError("Not impl");
    }

    parseStop() {
        throw new SqlError("Not impl");
    }

    parseSelect(start) {
        const lexer = this.lexer;
        const stmt = new SelectStatement(lexer.sql);

        stmt.context = lexer.ctx;
        stmt.start = start;
        this.parseSelectExprs(stmt);

        let type = lexer.token();
        switch (type) {
            case SqlToken.SIGN:
                if (lexer.prefix != ';') {
                    throw lexer.getError();
                }
            case SqlToken.EOS: // '' or ';'
                stmt.end = lexer.end;
                lexer.resetToken();
                return stmt;
            case SqlToken.ID:  // LIMIT | FROM ..
                if (lexer.quoted) throw lexer.getError();
                let id = lexer.slice();
                if (id == "LIMIT") {
                    start = lexer.start;
                    lexer.resetToken();
                    stmt.limitClause = this.parseSelectLimit(start);
                } else {
                    throw lexer.getError();
                }
                break;
            default:
                throw lexer.getError();
        }

        type = lexer.token();
        if (type == SqlToken.SIGN) {
            if (lexer.prefix != ';') {
                throw lexer.getError();
            }
            stmt.end = lexer.end;
            lexer.resetToken();
        } else if (type == SqlToken.EOS) {
            stmt.end = lexer.end;
        } else {
            throw lexer.getError();
        }
        
        let ctx = lexer.ctx;
        if (ctx.visitSelectStmt) {
            ctx.visitSelectStmt(stmt);
        }

        return stmt;
    }

    /** Parse limit clause, refs https://mariadb.com/kb/en/limit */
    parseSelectLimit(start) {
        let lexer = this.lexer;
        let type = lexer.token();

        // Next: [offset, ] rows | rows [OFFSET offset]
        if (type != SqlToken.INT && type != SqlToken.BIGINT) {
            throw lexer.getError();
        }
        let end = lexer.end;
        let rows = BigInt(lexer.slice(false));

        lexer.skipBlankComment();
        type = lexer.type;
        if (type == SqlToken.EOS) {
            let clause = new LimitClause(lexer.sql, rows);
            clause.setRange(start, end);
            lexer.resetToken();
            let ctx = lexer.ctx;
            if (ctx.visitLimitClause) {
                ctx.visitLimitClause(clause);
            }
            return clause;
        }
        
        let swap = true;
        if (type == SqlToken.SIGN) {
            let c = lexer.prefix;
            if (c == ',') {
                type = lexer.resetToken().token();
            } else if (c == ';') {
                let clause = new LimitClause(lexer.sql, rows);
                clause.setRange(start, end);
                lexer.resetToken();
                let ctx = lexer.ctx;
                if (ctx.visitLimitClause) {
                    ctx.visitLimitClause(clause);
                }
                return clause;
            }
        } else if (type == SqlToken.ID) {
            if (!lexer.quoted) {
                let id = lexer.slice();
                if (id == "OFFSET") {
                    type = lexer.resetToken().token();
                    swap = false;
                }
            }
        } else {
            throw lexer.getError();
        }

        if (type != SqlToken.INT && type != SqlToken.BIGINT) {
            throw lexer.getError();
        }

        let offset = BigInt(lexer.slice(false));
        if (swap) { let t = rows; rows = offset; offset = t; }
        end = lexer.end;
        lexer.resetToken();
        let clause = new LimitClause(lexer.sql, rows, offset);
        clause.setRange(start, end);
        let ctx = lexer.ctx;
        if (ctx.visitLimitClause) {
            ctx.visitLimitClause(clause);
        }

        return clause;
    }

    parseSelectExprs(stmt) {
        const lexer = this.lexer;
        let next = true;

        for (; next; ) {
            // Next set: literal, ID, unary op(+,-,!,~), '*', '@', '('
            let expr;
            let type = lexer.token();
            let c = lexer.prefix;
            switch (type) {
                case SqlToken.OP_ARI:
                    if (c == '*') {
                        throw lexer.getError();
                    } else {
                        throw lexer.getError();
                    }
                case SqlToken.SIGN:
                    if (c == '@') {
                        // 1) Usr var, eg. @, @., @1.2, @a, @a.b, @`a`, @'a', @"a";
                        // 2) Sys var, eg. @@a, @@`a`.
                        lexer.resetToken();
                        if (lexer.charAt() != '@') {
                            expr = this.parseUserVarExpr();
                        } else {
                            lexer.skip();
                            expr = this.parseSysVarExpr();
                        }
                    } else {
                        throw lexer.getError();
                    }
                    break;
                default:
                    throw lexer.getError();
            }

            // Next set: '' | ';' | ',' | FROM | INTO | LIMIT
            type = lexer.token();
            if (type == SqlToken.EOS) {
                next = false;
            } else if (type == SqlToken.SIGN) {
                switch (lexer.prefix) {
                    case ';': next = false; break;
                    case ',': lexer.resetToken(); break;
                    default: throw new SqlError('Not impl');
                }
            } else {
                next = false;
            }

            stmt.addSelectExpr(expr);
            stmt.end = lexer.curr;
        }

        return stmt;
    }

    parseSysVarExpr(prefix = "@@") {
        let scope = SysVarExpr.SCOPE_SESSION;
        let lexer = this.lexer;
        lexer.token(true, false);

        let type = lexer.type;
        if (type != SqlToken.ID) {
            throw lexer.getError();
        }
        
        let start = lexer.start - prefix.length;
        if (lexer.quoted) {
            start--;
        } else {
            let id = lexer.slice();
            // Parse scope: [GLOBAL.|SESSION.]
            if (id == "SESSION" || id == "GLOBAL") {
                lexer.skipBlankComment();
                type = lexer.type;
                if (type == SqlToken.SIGN && lexer.prefix == '.') {
                    if (id.length == 6) {
                        scope = SysVarExpr.SCOPE_GLOBAL;
                    }
                } else {
                    throw lexer.getError();
                }
                lexer.skipBlankComment();
                if (lexer.type != SqlToken.ID) {
                    throw lexer.getError();
                }
            }
        }
        
        // Parse identifier
        let sql = lexer.sql;
        let expr = new SysVarExpr(sql, scope);
        expr.context = lexer.ctx;
        expr.start = start;
        let id = this.parseIdentifier(SqlObject.TYPE_ID_SYS_VAR);
        expr.identifier = id;
        expr.end = (id.quoted? id.end + 1: id.end);
        let ctx = lexer.ctx;
        if (ctx.visitSysVar) {
            ctx.visitSysVar(expr);
        }

        return expr; 
    }

    /** Parse user variable, refs https://mariadb.com/kb/en/user-defined-variables */
    parseUserVarExpr(prefix = "@") {
        let lexer = this.lexer;

        lexer.token(false, false, true);
        if (lexer.type != SqlToken.USER_VAR) {
            throw lexer.getError();
        }

        let start = lexer.start - prefix.length;
        if (lexer.quoted) start--;
        let sqlName = new SqlName(lexer.sql, lexer.slice(false), 
            lexer.quoted, lexer.quotes);
        sqlName.context = lexer.ctx;
        sqlName.type = SqlObject.TYPE_ID_USER_VAR;
        sqlName.start = lexer.start;
        sqlName.end = lexer.end;
        sqlName.quoted = lexer.quoted;
        sqlName.quotes = lexer.quotes;

        let expr = new UserVarExpr(lexer.sql, sqlName);
        expr.context = lexer.ctx;
        expr.start = start;
        expr.end = lexer.curr;
        lexer.resetToken();
        let ctx = lexer.ctx;
        if (ctx.visitUserVar) {
            ctx.visitUserVar(expr);
        }

        return expr;
    }

    /** Parse sql identifier, refs https://mariadb.com/kb/en/identifier-names */
    parseIdentifier(type) {
        const maxLen = Identifier.maxLengthOf(type);
        let lexer = this.lexer;
        let name = lexer.slice(false);
        let quoted = lexer.quoted;
        let quotes = lexer.quotes;

        if (name.length > maxLen) {
            let s = `, identifier exceeds max length ${maxLen}`;
            throw lexer.getError(lexer.start, s);
        }
        let c = name.charAt(name.length - 1);
        if (lexer.isBlank(c)) {
            // Database, table and column names can't end with space characters
            if (SqlObject.TYPE_ID_SCHEMA === type || 
                SqlObject.TYPE_ID_TABLE  === type || 
                SqlObject.TYPE_ID_COLUMN === type) {
                throw lexer.getError();
            }
        }
        let id = new Identifier(lexer.sql, name, quoted, quotes, type);
        id.context = lexer.ctx;
        id.start = lexer.start;
        id.end = lexer.end;

        lexer.skipBlankComment();
        if (lexer.prefix != '.') {
            // Unqualified name can't be reserved words
            let rw = name.toUpperCase();
            if (this.reserved[rw]) {
                throw lexer.getError(id.start, `, a reserved word ${rw}`);
            }
        }
        let ctx = lexer.ctx;
        if (ctx.visitIdentifier) {
            ctx.visitIdentifier(id);
        }

        return id;
    }

}

module.exports = MysqlParser;
