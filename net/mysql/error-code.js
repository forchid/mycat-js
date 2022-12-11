const util = require('util');

class ErrorCode {

    static get ER_NO() { return 1002; }

    static get ER_YES() { return 1003; }

    static get ER_CON_COUNT_ERROR() { return 1040; }

    static get ER_DBACCESS_DENIED_ERRORR() { return 1044; }

    static get ER_ACCESS_DENIED_ERROR() { return 1045; }

    static get ER_NO_DB_ERROR() { return 1046; }

    static get ER_UNKNOWN_COM_ERROR() { return 1047; }

    static get ER_BAD_DB_ERROR() { return 1049; }

    static get ER_PARSE_ERROR() { return 1064; }

    static get ER_EMPTY_QUERY() { return 1065; }
    
    static get ER_UNKNOWN_CHARACTER_SET() { return 1115; }

    static get ER_NOT_ALLOWED_COMMAND() { return 1148; }

    static get ER_NET_PACKET_TOO_LARGE() { return 1153; }

    static get ER_CONNECT_TO_MASTER() { return 1218; }

    /** Query the message of the given errno, and additional format args.
     * 
     * @param errno The error number
     * @param args The message format arguments, an array or multi-args
     * @returns An object that includes message and sqlState, or null if not found
     */
    static messageOf(errno) {
        let args = arguments;
        switch (errno) {
            case this.ER_NO:
                return { message: "NO", sqlState: "HY000" };
            case this.ER_YES:
                return { message: "YES", sqlState: "HY000" };
            case this.ER_CON_COUNT_ERROR:
                return { message: "Too many connections", sqlState: "08004" };
            case this.ER_DBACCESS_DENIED_ERRORR:
                return { 
                    message: fm("Access denied for user '%s'@'%s' to database '%s'", args), 
                    sqlState: "42000" };
            case this.ER_ACCESS_DENIED_ERROR:
                return {
                    message: fm("Access denied for user '%s'@'%s' (using password: %s)", args), 
                    sqlState: "28000" };
            case this.ER_NO_DB_ERROR:
                return { message: "No database selected", sqlState: "3D000" };
            case this.ER_UNKNOWN_COM_ERROR:
                return { message: "Unknown command", sqlState: "08S01" };
            case this.ER_BAD_DB_ERROR:
                return { message: fm("Unknown database '%s'", args), sqlState: "42000" };
            case this.ER_PARSE_ERROR:
                return { message: fm("%s", args), sqlState: "42000" };
            case this.ER_EMPTY_QUERY:
                return { message: "Query was empty", sqlState: "42000" };
            case this.ER_UNKNOWN_CHARACTER_SET:
                return { message: fm("Unknown character set: '%s'", args), sqlState: "42000" };
            case this.ER_NOT_ALLOWED_COMMAND:
                return {
                    message: "The used command is not allowed with this MyCat version", 
                    sqlState: "42000" };
            case this.ER_NET_PACKET_TOO_LARGE:
                return { message: "Got a packet bigger than 'max_allowed_packet' bytes", 
                    sqlState: "08S01" };
            case this.ER_CONNECT_TO_MASTER:
                return { message: fm("Error connecting to master: %s", args), sqlState: "08S01" };
            default:
                return null;
        }
    }

}

function fm(f, args) {
    // args[0] is errno
    if (args.length > 1) {
        let arg = args[1];
        if (arg.constructor === Array) {
            return util.format(f, ... arg);
        } else {
            args = Array.prototype.slice.call(args, 1);
            return util.format(f, ... args);
        }
    } else {
        return f;
    }
}

module.exports = ErrorCode;
