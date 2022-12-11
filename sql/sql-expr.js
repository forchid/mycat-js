const SqlObject = require("./sql-object");

/** An expression in SQL statement, includes
 * - 1) column name;
 * - 2) function, operators, vars(@VAR, @@VAR), literals(1, 'a'..);
 * - 3) all columns(* or TB.*).\
 * Example: the column "birthday" in "select birthday from tbl_user".
 * 
 * @author little-pan
 * @since 2022-11-29
 */
class SqlExpr extends SqlObject {

    #alias = "";

    constructor (source) {
        super (source);
    }

    get hasAlias() {
        return !!this.#alias;
    }

    get alias() {
        let a = this.#alias;
        if (a) return a;
        else return this.sql;
    }

    set alias(a) {
        this.#alias = a;
    }

    toSql() {
        let sql = super.toSql();
        let parent = this.parent;

        if (this.rewritten && !this.hasAlias && parent && 
            parent.type === SqlObject.TYPE_STMT_SELECT) {
            let s = this.start;
            let e = this.end;
            let a = this.source.slice(s, e);
            let q = this.context.quotes;
            if (a.indexOf(q) == 0) {
                e = a.length - 1;
                sql += " as "+ SqlObject.escape(a, q, 1, e);
                a = a.slice(1, e);
            } else {
                sql += " as "+q + SqlObject.escape(a, q) +q;
            }
            this.#alias = a;
        }

        return sql;
    }

}

module.exports = SqlExpr;
