const PhysicalDataSource = require("../data-source/physical-data-source");

class MysqlDataSource extends PhysicalDataSource {

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

module.exports = MysqlDataSource;
