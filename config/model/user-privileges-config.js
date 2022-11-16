const StringHelper = require("../../util/string-helper");
const TypeHelper = require("../../util/type-helper");
const DataNodePrivilege = require('./priv/data-node-privilege');
const SchemaPrivilege = require('./priv/schema-privilege');

class UserPrivilegesConfig {

    #check = false;
    
    /** Schema level privileges: schema -> table CRUD privileges */
    #schemaPrivileges = new Map();
    
    /** DataNode level privileges: dataNode -> dataNode CRUD privileges */
    #dataNodePrivileges = new Map();
    
    get check() {
        return this.#check;
    }

    set check(check) {
        this.#check = ('true' === check || true === check);
    }

    get schemaPrivileges() { return this.#schemaPrivileges; }

    get dataNodePrivileges() { return this.#dataNodePrivileges; }

    addSchemaPrivilege(name, priv) {
        StringHelper.ensureNotBlank(name, 'schemaName');
        TypeHelper.ensureInstanceof(priv, SchemaPrivilege, 'schemaPrivilege');
        this.#schemaPrivileges.set(name, priv);
    }

    addDataNodePrivilege(name, priv) {
        StringHelper.ensureNotBlank(name, 'dataNode');
        TypeHelper.ensureInstanceof(priv, DataNodePrivilege, 'dataNodePrivilege');
        this.#dataNodePrivileges.set(name, priv);
    }

}

module.exports = UserPrivilegesConfig;
