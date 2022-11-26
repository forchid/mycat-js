class ErrorCode {

    static get ER_DBACCESS_DENIED_ERRORR() { return 1044; }

    static get ER_ACCESS_DENIED_ERROR() { return 1045; }

    static get ER_BAD_DB_ERROR() { return 1049; }
    
    static get ER_UNKNOWN_CHARACTER_SET() { return 1115; }

}

module.exports = ErrorCode;
