const PhysicalDataSource = require("../data-source/physical-data-source");
const db = require("db");
const BackConnection = require("../back-connection");

class MysqlDataSource extends PhysicalDataSource {

    constructor (dbConfig, dhConfig, readNode) {
        super(dbConfig, dhConfig, readNode);
    }

    createNewConnection(schema) {
        let config = this.dbConfig;
        let user = config.user;
        let pass = config.password;
        let ip = config.ip;
        let port = config.port || 3306;
        let id = BackConnection.NEXT_ID;
        let url = `mysql://${user}:${pass}@${ip}:${port}/${schema||''}`;

        let conn = db.open(url);
        let failed = true;
        let bc;
        try {
            bc = new BackConnection(id, conn, this);
            failed = false;
            return bc;
        } finally {
            if (failed) conn.close();
        }
    }

}

module.exports = MysqlDataSource;
