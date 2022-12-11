const SqlContext = require("./sql-context");
const SqlExpr = require("./sql-expr");

/**
 * SQL name includes identifier and user variable.
 * 
 * @author little-pan
 * @since 2022-11-30
 */
class SqlName extends SqlExpr {
    
    name = "";
    quoted = false;
    quotes = "";

    constructor (source, name, quoted = false, quotes = "", alias = "") {
        super(source);
        this.name = name;
        this.quoted = quoted;
        this.quotes = quotes;
        super.alias = alias;
    }

    get comparedName() {
        return this.name.toUpperCase();
    }

    get quotedName() {
        let q = this.quotes;
        if (q) {
            let mq = SqlContext.MSSQL_QUOTES;
            if (q === mq) return mq + this.name + "]";
            else return q + this.name + q;
        } else {
            return this.name;
        }
    }

}

module.exports = SqlName;
