const StringHelper = require("../util/string-helper");
const SqlError = require("./sql-error");

/**
 * The SQL object that represents statement, clause, expression, 
 * identifier, function, operator, and literal etc.
 * 
 * @author little-pan
 * @since 2022-12-01
 */
class SqlObject {
    
    /** The sql context. */
    context = null;
    /** The parent sql object of this. */
    parent = null;
    /** The children sql objects of this. */
    children = [];
    /** The replacement of this sql object. The object isn't 
     * replaced if value is null or undefined, default null.
     */
    value = null;

    #source = "";
    #start = 0;
    #end = 0;
    #type = 0; // 0 undefined
    #sql = "";
    #rewritten = false;

    constructor (source = "", start = 0, end = 0) {
        this.#source = source;
        this.#start = start;
        this.#end = end;
    }

    get rewritten() { return this.#rewritten; }

    get type() { return this.#type; }

    set type(type) { this.#type = type; }

    /** The SQL statement where this object. */
    get source() { return this.#source; }

    set source(s) { this.#source = s; this.#sql = ""; }

    /** The start position of this object in it's source. */
    get start() { return this.#start; }

    set start(i) { this.#start = i; this.#sql = ""; }

    /** The end position of this object in it's source. */
    get end() { return this.#end; }

    set end(i) { this.#end = i; this.#sql = ""; }

    /** The sql string of this SQL object. */
    get sql() {
        let s = this.#sql;
        if (s) {
            return s;
        } else {
            return this.#sql = this.toSql();
        }
    }

    set sql(s) {
        this.#sql = s;
    }

    setRange(start, end) {
        this.start = start;
        this.end = end;
        return this;
    }

    addChild(ch) {
        this.children.push(ch);
        ch.parent = this;
        return this;
    }

    replaced(recur = false) {
        let v = this.value;
        if (v === null || v === undefined) {
            if (recur) {
                let children = this.children;
                for (let ch of children) {
                    if (ch.replaced(recur)) {
                        return true;
                    }
                }
            }
            return false;
        } else {
            return true;
        }
    }

    /** Transform this sql object to it's sql string.
     * @returns a sql string
     */
    toSql() {
        if (this.replaced()) {
            let value = this.value;
            let vc = value.constructor;

            this.#rewritten = true;
            if (vc == Number || vc == BigInt || vc == Boolean) {
                if (isNaN(value)) {
                    let e = "This sql object value is NaN!";
                    throw new SqlError(e);
                }
                return (value + "");
            }
            
            if (vc == Date) {
                let s = StringHelper.formatTimestamp(value);
                return ("'"+ s +"'");
            }
    
            value = value + "";
            // escape '\''
            let sql = value;
            let i = value.indexOf('\'');
            if (i !== -1) {
                sql = SqlObject.escape(value, '\'');
            }
            return ("'"+ sql + "'");
        } else {
            let children = this.children;
            let replaces = collectReplaces(children);
            if (replaces.length > 0) {
                let source = this.source;
                let start = this.start;
                let sql = "";
                for (let rep of replaces) {
                    if (start > rep.start) {
                        let e = "The sql children out of order";
                        throw new SqlError(e);
                    }
                    sql += source.slice(start, rep.start);
                    sql += rep.toSql();
                    start = rep.end;
                }
                if (start < this.end) {
                    sql += source.slice(start, this.end);
                }
                this.#rewritten = true;
                return sql;
            } else {
                return this.source.slice(this.start, this.end);
            }
        }
    }

    toString() {
        return this.sql;
    }

    static escape(s, c, start = 0, end = -1) {
        if (!c || c.constructor != String || c.length !== 1) {
            throw new TypeError(`The arg c '${c}' not a char!`);
        }

        let left = "", right = "";
        if (end === -1) end = s.length;
        if (start !== 0 || end !== s.length) {
            left = s.slice(0, start);
            s = s.slice(start, end);
            right = s.slice(end, s.length);
        }

        let i = s.indexOf(c);
        let mid = s;
        if (i !== -1) {
            let n = s.length;
            let b = 0;
            mid = "";
            for (;;) {
                mid += s.slice(b, ++i);
                mid += c;
                if (i < n) {
                    let a = s.charAt(i++);
                    if (a != c) mid += a;
                } else {
                    break;
                }
                let j = s.indexOf(c, i);
                if (j === -1) {
                    if (i < n) mid += s.slice(i);
                    break;
                }
                b = i;
                i = j;
            }
        }

        return (left + mid + right);
    }

    static get TYPE_ID_SCHEMA() { return 1; }

    static get TYPE_ID_TABLE() { return 2; }

    static get TYPE_ID_INDEX() { return 3; }

    static get TYPE_ID_COLUMN() { return 4; }

    static get TYPE_ID_ALIAS() { return 5; }

    static get TYPE_ID_VIEW() { return 6; }

    static get TYPE_ID_ROUTINE() { return 7; }

    static get TYPE_ID_TRIGGER() { return 8; }

    static get TYPE_ID_CONSTRAINT() { return 9; }

    static get TYPE_ID_EVENT() { return 10; }

    static get TYPE_ID_SYS_VAR() { return 11; }

    static get TYPE_ID_USER_VAR() { return 12; }

    static get TYPE_ID_PARTITION() { return 13; }
    
    static get TYPE_ID_TABLE_SPACE() { return 14; }

    static get TYPE_ID_SAVE_POINT() { return 15; }

    static get TYPE_ID_LABEL() { return 16; }

    static get TYPE_ID_USER() { return 17; }

    static get TYPE_ID_ROLE() { return 18; }

    static get TYPE_ID_SERVER() { return 19; }

    static get TYPE_ID_LOG_GROUP() { return 20; }

    // Statement type from 100
    static get TYPE_STMT_SELECT() { return 100; }

    static get TYPE_STMT_INSERT() { return 101; }

    static get TYPE_STMT_UPDATE() { return 102; }

    static get TYPE_STMT_DELETE() { return 103; }

    static get TYPE_STMT_SHOW() { return 104; }

    // Clause type from 500
    static get TYPE_CLAUSE_LIMIT() { return 500; }

    // Expression type from 1000
    static get TYPE_EXPR_USER_VAR() { return 1000; }
    
}

function collectReplaces(exprs, replaces) {
    replaces = replaces || [];
    for (let ch of exprs) {
        if (ch.replaced()) {
            replaces.push(ch);
            // all children replaced
        } else {
            let cc = ch.children;
            collectReplaces(cc, replaces);
        }
    }
    return replaces;
}

module.exports = SqlObject;
