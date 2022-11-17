const StringHelper = require("../../../util/string-helper");
const TypeHelper = require("../../../util/type-helper");
const TablePrivilege = require('./table-privilege');
const ConfigError = require("../../config-error");

class SchemaPrivilege {
    
    #name = '';
    #dml = [ 0, 0, 0, 0];
    /** A Map: table name -> table privileges */
    #tablePrivileges = new Map();

    get name() {
        return this.#name;
    }

    set name(name) {
        this.#name = StringHelper.ensureNotBlank(name, 'schema name');
    }

    get dml() {
        return this.#dml;
    }

    set dml(dml) {
        let a = TypeHelper.ensureInstanceof(dml, Array, 'schema dml');
        if (a.length === 4) {
            this.#dml = dml;
        } else {
            throw new ConfigError(`schema dml length should be 4`);
        }
    }

    get dmlText() {
        let res = '';
        this.dml.forEach(i => res += i);
        return res;
    }

    addTablePrivilege(tab, priv) {
        StringHelper.ensureNotBlank(tab, 'table name');
        TypeHelper.ensureInstanceof(priv, TablePrivilege, 'table privilege');
        this.#tablePrivileges.set(tab, priv);
    }

    getTablePrivilege(tab) {
        return this.#tablePrivileges.get(tab);
    }

}

module.exports = SchemaPrivilege;

