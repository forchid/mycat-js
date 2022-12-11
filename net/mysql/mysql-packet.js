const UnsupportedError = require("../../lang/unsupported-error");

class MysqlPacket {

    /**
     * none, this is an internal thread state
     */
    static get COM_SLEEP() { return 0; }

    /**
     * mysql_close
     */
    static get COM_QUIT() { return 1; }

    /**
     * mysql_select_db
     */
    static get COM_INIT_DB() { return 2; }

    /**
     * mysql_real_query
     */
    static get COM_QUERY() { return 3; }

    /**
     * mysql_list_fields
     */
    static get COM_FIELD_LIST() { return 4; }

    /**
     * mysql_create_db (deprecated)
     */
    static get COM_CREATE_DB() { return 5; }

    /**
     * mysql_drop_db (deprecated)
     */
    static get COM_DROP_DB() { return 6; }

    /**
     * mysql_refresh
     */
    static get COM_REFRESH() { return 7; }

    /**
     * mysql_shutdown
     */
    static get COM_SHUTDOWN() { return 8; }

    /**
     * mysql_stat
     */
    static get COM_STATISTICS() { return 9; }

    /**
     * mysql_list_processes
     */
    static get COM_PROCESS_INFO() { return 10; }

    /**
     * none, this is an internal thread state
     */
    static get COM_CONNECT() { return 11; }

    /**
     * mysql_kill
     */
    static get COM_PROCESS_KILL() { return 12; }

    /**
     * mysql_dump_debug_info
     */
    static get COM_DEBUG() { return 13; }

    /**
     * mysql_ping
     */
    static get COM_PING () { return 14; }

    /**
     * none, this is an internal thread state
     */
    static get COM_TIME() { return 15; }

    /**
     * none, this is an internal thread state
     */
    static get COM_DELAYED_INSERT() { return 16; }

    /**
     * mysql_change_user
     */
    static get COM_CHANGE_USER() { return 17; }

    /**
     * used by slave server mysqlbinlog
     */
    static get COM_BINLOG_DUMP() { return 18; }

    /**
     * used by slave server to get master table
     */
    static get COM_TABLE_DUMP() { return 19; }

    /**
     * used by slave to log connection to master
     */
    static get COM_CONNECT_OUT() { return 20; }

    /**
     * used by slave to register to master
     */
    static get COM_REGISTER_SLAVE() { return 21; }

    /**
     * mysql_stmt_prepare
     */
    static get COM_STMT_PREPARE() { return 22; }

    /**
     * mysql_stmt_execute
     */
    static get COM_STMT_EXECUTE() { return 23; }

    /**
     * mysql_stmt_send_long_data
     */
    static get COM_STMT_SEND_LONG_DATA() { return 24; }

    /**
     * mysql_stmt_close
     */
    static get COM_STMT_CLOSE() { return 25; }

    /**
     * mysql_stmt_reset
     */
    static get COM_STMT_RESET() { return 26; }

    /**
     * mysql_set_server_option
     */
    static get COM_SET_OPTION() { return 27; }

    /**
     * mysql_stmt_fetch
     */
    static get COM_STMT_FETCH() { return 28; }

    /**
     * mysql_reset_connection
     */
    static get COM_RESET_CONNECTION() { return 31; }

    /**
     * Mycat heartbeat
     */
    static get COM_HEARTBEAT() { return 64; }
    
    static get packetHeaderSize() { 4; }

    static get maxPayloadSize() { return 0xffffff; }

    /** A packet consists of payload_length, sequence_id, payload. */
    payloadLength = 0;
    sequenceId = 0;

    get packetInfo() {
        throw new UnsupportedError('Property packetInfo not impl');
    }

    /** Write this packet into the write buffer of the frontConn. 
     * @returns the current position of this write buffer
    */
    write(frontConn, offset = 0, flush = false) {
        throw new UnsupportedError('write() not impl');
    }

    calcPayloadLength() {
        throw new UnsupportedError('calcPayloadLength() not impl');
    }

    toString() {
        return `${this.packetInfo}{payloadLength = ${this.payloadLength}, sequenceId = ${this.sequenceId}}`;
    }

}

module.exports = MysqlPacket;
