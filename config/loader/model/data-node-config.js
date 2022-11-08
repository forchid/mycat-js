// A named data sharding, that is coordinated 
//by a dataHost and a database.
// 
// @author little-pan
// @since 2022-11-08
// 
class DataNodeConfig {

    #name;
	#database;
    #dataHost;

    constructor(name, database, dataHost) {
        if (!name instanceof String) {
            throw new TypeError(`name must be a string`);
        }
        if (!database instanceof String) {
            throw new TypeError(`database must be a string`);
        }
        if (!dataHost instanceof String) {
            throw new TypeError(`dataHost must be a string`);
        }
        this.#name = name;
        this.#database = database;
        this.#dataHost = dataHost;
    }

    get name() { return this.#name; }

    get database() { return this.#database; }

    get dataHost() { return this.#dataHost; }
}

module.exports = DataNodeConfig;
