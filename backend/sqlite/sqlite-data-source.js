const PhysicalDataSource = require("../data-source/physical-data-source");

class SqliteDataSource extends PhysicalDataSource {

    constructor (dbConfig, dhConfig, readNode) {
        super(dbConfig, dhConfig, readNode);
    }

    createHeartbeat() {
        // TODO
        return null;
    }

    createNewConnection(schema) {
        // TODO
        return null;
    }

}

module.exports = SqliteDataSource;
