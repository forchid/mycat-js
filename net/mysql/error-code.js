const util = require('util');

class ErrorCode {

    static get ER_CON_COUNT_ERROR() { return 1040; }

    static get ER_DBACCESS_DENIED_ERRORR() { return 1044; }

    static get ER_ACCESS_DENIED_ERROR() { return 1045; }

    static get ER_UNKNOWN_COM_ERROR() { return 1047; }

    static get ER_BAD_DB_ERROR() { return 1049; }
    
    static get ER_UNKNOWN_CHARACTER_SET() { return 1115; }

    /** Query the message of the given errno, and additional format args.
     * 
     * @param errno The error number
     * @param args The message format arguments, an array or multi-args
     * @returns An object that includes message and sqlState, or null if not found
     */
    static messageOf(errno) {
        let args = arguments;
        switch (errno) {
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
            case this.ER_UNKNOWN_COM_ERROR:
                return { message: "Unknown command", sqlState: "08S01" };
            case this.ER_BAD_DB_ERROR:
                return { message: fm("Unknown database '%s'", args), sqlState: "42000" };
            case this.ER_UNKNOWN_CHARACTER_SET:
                return { message: fm("Unknown character set: '%s'", args), sqlState: "42000" };
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
