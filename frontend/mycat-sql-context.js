const SqlContext = require("../sql/sql-context");

class MycatSqlContext extends SqlContext {

    source = null;

    constructor(frontConn) {
        super();
        this.source = frontConn;
    }

    visitSysVar(sysVar) {
        let name = sysVar.name;
        let va = this.source.getSysVar(name);
        if (va !== undefined) {
            sysVar.value = va.value;
        }
        return sysVar;
    }

}

module.exports = MycatSqlContext;
