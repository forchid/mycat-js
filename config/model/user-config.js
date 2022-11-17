const StringHelper = require("../../util/string-helper");
const TypeHelper = require("../../util/type-helper");
const ConfigError = require("../config-error");
const UserPrivilegesConfig = require('./user-privileges-config');

/**
 * Schema user account and privileges config.
 * 
 * @author little-pan
 * @since 2022-11-16
 */
class UserConfig {

    #name = '';
    #password = '';             // plain-text
    #encryptPassword = '';      // cipher-text
    #benchmark = 0;             // load limit, default 0 as un-limit
    #privilegesConfig = new UserPrivilegesConfig(); // SQL table level CRUD privileges
	
    #defaultAccount = false;    // password-less login or not
    #readOnly = false;

    #defaultSchema = '';
    #schemas = new Set();

    constructor() {

    }

    get name() { 
        return this.#name;
    }

    set name(name) {
        this.#name = TypeHelper.ensureString(name, 'user name');
    }

    get password() { 
        return this.#password;
    }

    set password(password) {
        this.#password = TypeHelper.ensureString(password, 'user password');
    }

    get encryptPassword() { 
        return this.#encryptPassword;
    }

    set encryptPassword(password) {
        this.#encryptPassword = TypeHelper.ensureString(password, 'user encryptPassword');
    }

    get benchmark() { 
        return this.#benchmark;
    }

    set benchmark(benchmark) {
        let n = TypeHelper.parseIntDecimal(benchmark, 'user benchmark');
        if (n >= 0) {
            this.#benchmark = n;
        } else {
            throw new ConfigError(`user benchmark ${n} less than 0`);
        }
    }

    get privilegesConfig() { 
        return this.#privilegesConfig;
    }

    set privilegesConfig(priv) {
        this.#privilegesConfig = TypeHelper.ensureInstanceof(priv, 
            UserPrivilegesConfig, 'user privileges');
    }

    get defaultAccount() { 
        return this.#defaultAccount;
    }

    set defaultAccount(defAccount) {
        this.#defaultAccount = (true === defAccount || 'true' === defAccount);
    }

    get readOnly() { 
        return this.#readOnly;
    }

    set readOnly(readOnly) {
        this.#readOnly = ('true' === readOnly || true === readOnly);
    }

    get defaultSchema() { 
        return this.#defaultSchema;
    }

    set defaultSchema(defSchema) {
        this.#defaultSchema = StringHelper.ensureNotBlank(defSchema, 'user defaultSchema');
    }

    get schemas() { 
        return this.#schemas;
    }

    set schemas(schemas) {
        this.#schemas = TypeHelper.ensureInstanceof(schemas, Set, 'user schemas');
    }

}

module.exports = UserConfig;
