const MysqlParser = require("./parser/mysql-parser");
const SqlError = require("./sql-error");

class Sql {

    static parser(dbName) {
        switch (dbName) {
            case "mysql":
            case "mariadb":
                return new MysqlParser();
            default:
                throw new SqlError(`The ${dbName} parser not impl`);
        }
    }

}

module.exports = Sql;
