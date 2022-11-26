class Capabilities {

    /** new more secure passwords */
    static get CLIENT_LONG_PASSWORD(){ return 1; }

    /** Found instead of affected rows */
    static get CLIENT_FOUND_ROWS(){ return 2; }

    /** Get all column flags */
    static get CLIENT_LONG_FLAG(){ return 4; }

    /** One can specify db on connect */
    static get CLIENT_CONNECT_WITH_DB(){ return 8; }

    /** Don't allow database.table.column */
    static get CLIENT_NO_SCHEMA(){ return 16; }

    /** Can use compression protocol */
    static get CLIENT_COMPRESS(){ return 32; }

    /** ODBC client */
    static get CLIENT_ODBC(){ return 64; }

    /** Can use LOAD DATA LOCAL */
    static get CLIENT_LOCAL_FILES(){ return 128; }

    /** Ignore spaces before '(' */
    static get CLIENT_IGNORE_SPACE(){ return 256; }

    /** New 4.1 protocol This is an interactive client */
    static get CLIENT_PROTOCOL_41(){ return 512; }

    /** This is an interactive client */
    static get CLIENT_INTERACTIVE(){ return 1024; }

    /** Switch to SSL after handshake */
    static get CLIENT_SSL(){ return 2048; }

    /** IGNORE sigpipes */
    static get CLIENT_IGNORE_SIGPIPE(){ return 4096; }

    /** Client knows about transactions */
    static get CLIENT_TRANSACTIONS(){ return 8192; }

    /** Old flag for 4.1 protocol */
    static get CLIENT_RESERVED(){ return 16384; }

    /** New 4.1 authentication */
    static get CLIENT_SECURE_CONNECTION(){ return 32768; }

    /** Enable/disable multi-stmt support */
    static get CLIENT_MULTI_STATEMENTS(){ return 65536; }

    /** Enable/disable multi-results */
    static get CLIENT_MULTI_RESULTS(){ return 131072; }
    
    static get CLIENT_PLUGIN_AUTH(){ return 0x00080000; }// 524288

}

module.exports = Capabilities;
