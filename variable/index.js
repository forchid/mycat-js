const SysVarExpr = require("../sql/expr/sys-var-expr");

class Variable {

    name = '';
    value = null;
    #defVal = null;
    scope = 0;
    dynamic = true;
    dataType = 0;
    description = '';

    /** The copy source */
    #source = null;

    constructor(name = '', value = null, defVal = null, scope = 0, 
        dynamic = true, dataType = 0, description = '') {
        this.name = name;
        this.value = value || defVal;
        this.#defVal = defVal;
        this.scope = scope;
        this.dynamic = dynamic;
        this.dataType = dataType;
        this.description = description;
    }

    get defVal() { return this.#defVal; }

    setDefault() {
        if (this.dynamic) {
            this.value = this.defVal;
            return true;
        } else {
            return false;
        }
    }

    get source() { return this.#source; }

    get isCopy() { return this.source !== null; }

    get scopeName() {
        switch (this.scope) {
            case SysVarExpr.SCOPE_GLOBAL:
                return "Global";
            case SysVarExpr.SCOPE_SESSION:
                return "Session";
            default:
                if (this.scope == SysVarExpr.SCOPE_GLOBAL 
                    | SysVarExpr.SCOPE_SESSION) {
                    return "Global, Session";
                } else {
                    return "Session";
                }
        }
    }

    copy() {
        let va = new Variable(this.name, this.value, this.defVal, this.scope, 
            this.dynamic, this.dataType, this.description);
        va.#source = this;
        return va;
    }

    static get DT_BOOL() { return 1; }

    static get DT_NUM() { return 2; }

    static get DT_STR() { return 4; }

}

module.exports = Variable;
