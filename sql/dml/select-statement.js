const SqlError = require("../sql-error");
const SqlObject = require("../sql-object");
const SqlStatement = require("../sql-statement");

class SelectStatement extends SqlStatement {

    #selectExprs = [];
    #limitClause = null;

    constructor (source) {
        super(source);
        super.type = SqlObject.TYPE_STMT_SELECT;
    }

    addSelectExpr(expr) {
        let a = this.#selectExprs;
        if (expr.constructor == Array) {
            for (let e of expr) {
                a.push(e);
                this.addChild(e);
            }
        } else {
            a.push(expr);
            this.addChild(expr);
        }
    }

    get limitClause() {
        return this.#limitClause;
    }

    set limitClause(clause) {
        if (this.limitClause) {
            throw new SqlError("Limit clause had been set");
        }
        this.#limitClause = clause;
        this.addChild(clause);
    }

    get selectExprs() { return this.#selectExprs; }
    
}

module.exports = SelectStatement;
