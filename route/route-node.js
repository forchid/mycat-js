const SqlObject = require("../sql/sql-object");

/** The data node of a sql statement route result.
 * 
 * @author little-pan
 * @since 2022-12-07
 */
class RouteNode {

    /** The route result. */
    result = null;
    // Data node that will execute the sql statement
    #name = '';
    // Sql statement object that will be executed on the data node
    #statement = null;
    #canRunInReadDB = false;
    /** Force sql to execute on master if false. */ 
    runOnSlave = false;
    #hasBalanceFlag = false;

    constructor (name, statement) {
        let stmtType = statement.type;
        this.#name = name;
        this.#statement = statement;
        this.#canRunInReadDB = (stmtType == SqlObject.TYPE_STMT_SELECT 
            || stmtType == SqlObject.TYPE_STMT_SHOW);
        this.#hasBalanceFlag = statement.hasComment("balance");
    }

    /** The data node name. The data node that will execute the sql statement. */
    get name() {
        return this.#name;
    }

    /** The sql statement object that will be executed on the data node. */
    get statement() {
        return this.#statement;
    }

    get sql() {
        return this.statement.sql;
    }

    get canRunInReadDB() {
        return this.#canRunInReadDB;
    }

    get hasBalanceFlag() {
        return this.#hasBalanceFlag;
    }

    toString() {
        return `RouteNode{name = '${this.name}'}`;
    }

}

module.exports = RouteNode;
