const SysVarExpr = require("../../sql/expr/sys-var-expr");
const Variable = require("../../variable");

class ServerSysVariables {

    static createSysVars() {
        let vars = new Map();

        for (let [k, v] of def) {
            if (v.dynamic) vars.set(k, v.copy());
            else vars.set(k, v);
        }

        return vars;
    }

}

const def = new Map();
let name = "version_comment";
def.set(name, new Variable(name, null, "MyCat Server (OpenCloudDB)", 
    SysVarExpr.SCOPE_GLOBAL, false, Variable.DT_STR, "Version comment"));

module.exports = ServerSysVariables;
