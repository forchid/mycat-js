const StringHelper = require('../../util/string-helper');

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
        StringHelper.ensureNotBlank(name, 'name');
        StringHelper.ensureNotBlank(database, 'database');
        StringHelper.ensureNotBlank(dataHost, 'dataHost');
        this.#name = name;
        this.#database = database;
        this.#dataHost = dataHost;
    }

    get name() { return this.#name; }

    get database() { return this.#database; }

    get dataHost() { return this.#dataHost; }
}

module.exports = DataNodeConfig;
