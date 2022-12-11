const SqlError = require("../sql-error");
const SqlExpr = require("../sql-expr");

class SysVarExpr extends SqlExpr {
    
    #scope = SysVarExpr.SCOPE_SESSION;
    #identifier = null;
    
    constructor (source, scope) {
        super(source);
        if (scope !== SysVarExpr.SCOPE_GLOBAL && 
            scope !== SysVarExpr.SCOPE_SESSION) {
            throw new SqlError(`Unknown variable scope ${scope}`);
        }
        this.#scope = scope;
    }

    get name() {
        return this.identifier.name;
    }

    get identifier() {
        return this.#identifier;
    }

    set identifier(id) {
        this.#identifier = id;
    }

    get scope() { return this.#scope; }

    get globalVar() { return SysVarExpr.SCOPE_GLOBAL === this.scope; }

    get sessionVar() { return SysVarExpr.SCOPE_SESSION === this.scope; }

    static get SCOPE_GLOBAL() { return 1; }

    static get SCOPE_SESSION() { return 2; }

}

module.exports = SysVarExpr;
