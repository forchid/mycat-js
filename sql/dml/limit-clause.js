const SqlObject = require("../sql-object");

class LimitClause extends SqlObject {

    offset = 0n;
    rows = 0n;

    constructor (source, rows = 0n, offset = 0n) {
        super(source);
        this.rows = rows;
        this.offset = offset;
        super.type = SqlObject.TYPE_CLAUSE_LIMIT;
    }

}

module.exports = LimitClause;
