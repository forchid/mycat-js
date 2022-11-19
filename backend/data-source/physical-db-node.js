class PhysicalDbNode {
    
    #name = '';
	#database = '';
	#dbPool = null;

    constructor (name, database, dbPool) {
        this.#name = name;
        this.#database = database;
        this.#dbPool = dbPool;
    }

    get name() {
        return this.#name;
    }

    get database() {
        return this.#database;
    }

    get dbPool() {
        return this.#dbPool;
    }

}

module.exports = PhysicalDbNode;
