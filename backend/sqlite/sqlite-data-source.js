const BackConnection = require("../back-connection");
const PhysicalDataSource = require("../data-source/physical-data-source");
const db = require("db");

class SqliteDataSource extends PhysicalDataSource {

    constructor (dbConfig, dhConfig, readNode) {
        super(dbConfig, dhConfig, readNode);
    }

    createNewConnection(schema) {
        let id = BackConnection.NEXT_ID;
        let config = this.dbConfig;
        let url = config.url;
        let pfx = "sqlite:";
        let i = url.indexOf(pfx);
        if (i === -1) url = pfx + url;

        let conn = db.open(url);
        let bc;
        let failed = true;
        try {
            bc = new BackConnection(id, conn, this);
            failed = false;
            return bc;
        } finally {
            if (failed) conn.close();
        }
    }

}

module.exports = SqliteDataSource;
