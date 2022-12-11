const SqlExpr = require("../sql-expr");
const SqlObject = require("../sql-object");

/**
 * The user variable isn't an identifier, may be empty, not qualifier, 
 * can have the unquoted char '.', or it's length can exceed 256.
 * 
 * @author little-pan
 * @since 2022-11-30
 */
class UserVarExpr extends SqlExpr {

    #sqlName = null;

    constructor (source, sqlName) {
        super(source);
        this.#sqlName = sqlName;
        super.type = SqlObject.TYPE_EXPR_USER_VAR;
    }

    get name() {
        return this.sqlName.name;
    }

    get sqlName() { return this.#sqlName; }

}

module.exports = UserVarExpr;
