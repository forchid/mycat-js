const ConfigError = require('../config-error');
const Isolation = require('../isolation');
const NetHelper = require('../../net/net-helper');
const StringHelper = require('../../util/string-helper');
const TypeHelper = require('../../util/type-helper');
const process = require('process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class SystemConfig {

    // Static fields
    static #ARGV = parseArgv(); //{ props: {}, args: [] };
    static #PROP_SYS_HOME = 'MYCAT_HOME';
    static #PROP_LOG_FILE_DISABLED = 'disable-log-file';

    static #DEFAULT_PORT = 8066;
    static #DEFAULT_MANAGER_PORT = 9066;
    static #DEFAULT_CHARSET = 'utf8';
    static #DEFAULT_SQL_PARSER = 'myparser'; // mycat-js builtin SQL parser
    static #DEFAULT_BUFFER_CHUNK_SIZE = 4096;
    static #DEFAULT_BUFFER_POOL_PAGE_SIZE = 1024 * 4096; // Default 4m
    static #DEFAULT_PROCESSORS = os.cpuNumbers();
    static #RESERVED_SYSTEM_MEMORY_BYTES = '384m';
    static #MEMORY_PAGE_SIZE = '1m';
	static #SPILLS_FILE_BUFFER_SIZE = '2K';
    static #DEFAULT_POOL_SIZE = 128;// Default max size for keep backends
	static #DEFAULT_IDLE_TIMEOUT = 30 * 60 * 1000;
	static #DEFAULT_AUTH_TIMEOUT = 15 * 1000;
    static #DEFAULT_PROCESSOR_CHECK_PERIOD = 1 * 1000;
	static #DEFAULT_DATA_NODE_IDLE_CHECK_PERIOD = 5 * 60 * 1000;
	static #DEFAULT_DATA_NODE_HEARTBEAT_PERIOD = 10 * 1000;
    static #DEFAULT_CLUSTER_HEARTBEAT_PERIOD = 5 * 1000;
	static #DEFAULT_CLUSTER_HEARTBEAT_TIMEOUT = 10 * 1000;
	static #DEFAULT_CLUSTER_HEARTBEAT_RETRY = 10;
    static #DEFAULT_MAX_LIMIT = 100;
	static #DEFAULT_CLUSTER_HEARTBEAT_USER = '_HEARTBEAT_USER_';
	static #DEFAULT_CLUSTER_HEARTBEAT_PASS = '_HEARTBEAT_PASS_';
    static #DEFAULT_PARSER_COMMENT_VERSION = 50148;
	static #DEFAULT_SQL_RECORD_COUNT = 10;
	static #DEFAULT_USE_ZK_SWITCH = false;
	static #DEFAULT_MAX_PREPARED_STMT_COUNT = 16382;

    static #SEQUENCE_HANDLER_PATTERN = '(?:(\\s*next\\s+value\\s+for\\s*MYCATSEQ_(\\w+))(,|\\)|\\s)*)+';
    static #SEQUENCE_HANDLER_LOCAL_FILE = 0;
	static #SEQUENCE_HANDLER_MYSQL_DB = 1;
	static #SEQUENCE_HANDLER_LOCAL_TIME = 2;
	static #SEQUENCE_HANDLER_ZK_DISTRIBUTED = 3;
	static #SEQUENCE_HANDLER_ZK_GLOBAL_INCREMENT = 4;
	static #SEQUENCE_HANDLER_DEF_GLOBAL_INCREMENT = 5;
	static #SEQUENCE_HANDLER_CLASS = '';
    static #DEFAULT_SEQUENCE_MYSQL_RETRY_COUNT = 4;
	static #DEFAULT_SEQUENCE_MYSQL_WAIT_TIME = 10 * 1000;// mysql SEQ db wait timeout

    static #MULTI_NODE_LIMIT_SMALL_DATA = 0;
	static #MULTI_NODE_LIMIT_LARGE_DATA = 1;
	static #MULTI_NODE_LIMIT_PATCH_SIZE = 100;
    static #CHECK_TABLE_CONSISTENCY_PERIOD = 1 * 60 * 1000;
    static #DEFAULT_GLOBAL_TABLE_CHECK_PERIOD = 24 * 60 * 60 * 1000;
    static #DEFAULT_NONE_PASSWORD_LOGIN = 0;

    // Instance fields
    #bindIp = '0.0.0.0';
    #serverPort = SystemConfig.#DEFAULT_PORT; // MyCat server listen port
    #managerPort = SystemConfig.#DEFAULT_MANAGER_PORT; // MyCat manager listen port
    #serverBacklog = 2048;
	#charset = SystemConfig.#DEFAULT_CHARSET; // MyCat network conn charset
	#processors = SystemConfig.#DEFAULT_PROCESSORS;
	#processorExecutor = (SystemConfig.#DEFAULT_PROCESSORS != 1) ? 
        SystemConfig.#DEFAULT_PROCESSORS * 2 : 4;;
    
    #removeGraveAccent = 1;

    #frontSocketSoRcvbuf = 1024 * 1024;
	#frontSocketSoSndbuf = 4 * 1024 * 1024;
    #frontSocketNoDelay = 1; // 0=false
    #frontWriteQueueSize = 2048;
    #fakeMySQLVersion = '5.6';

    #backSocketSoSndbuf = 1024 * 1024;
	#backSocketSoRcvbuf = 4 * 1024 * 1024; // mysql 5.6 net_buffer_length default 4M
	#backSocketNoDelay = 1; // 1=true

    #maxStringLiteralLength = 65535;
    #timerExecutor = 1;
	#managerExecutor = 1;
	#idleTimeout = SystemConfig.#DEFAULT_IDLE_TIMEOUT;
	#authTimeout = SystemConfig.#DEFAULT_AUTH_TIMEOUT;
	#catletClassCheckSeconds = 60;
	// sql execute timeout (second)
	#sqlExecuteTimeout = 300;
	#processorCheckPeriod = SystemConfig.#DEFAULT_PROCESSOR_CHECK_PERIOD;
    #dataNodeIdleCheckPeriod = SystemConfig.#DEFAULT_DATA_NODE_IDLE_CHECK_PERIOD;
	#dataNodeHeartbeatPeriod = SystemConfig.#DEFAULT_DATA_NODE_HEARTBEAT_PERIOD;
	#clusterHeartbeatUser = SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_USER;
	#clusterHeartbeatPass = SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_PASS;
	#clusterHeartbeatPeriod = SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_PERIOD;
	#clusterHeartbeatTimeout= SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_TIMEOUT;
	#clusterHeartbeatRetry = SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_RETRY;
	#txIsolation = Isolation.REPEATED_READ;
	#parserCommentVersion = SystemConfig.#DEFAULT_PARSER_COMMENT_VERSION;
    #sqlRecordCount = SystemConfig.#DEFAULT_SQL_RECORD_COUNT;
	#sequenceHandlerPattern = SystemConfig.#SEQUENCE_HANDLER_PATTERN;
    #sequenceHandlerType = SystemConfig.#SEQUENCE_HANDLER_LOCAL_FILE;
    #sequenceMySqlRetryCount = SystemConfig.#DEFAULT_SEQUENCE_MYSQL_RETRY_COUNT;
    #sequenceMySqlWaitTime = SystemConfig.#DEFAULT_SEQUENCE_MYSQL_WAIT_TIME;

	#maxPreparedStmtCount = SystemConfig.#DEFAULT_MAX_PREPARED_STMT_COUNT;
    // Buffer pool limit = bufferPoolPageSize * bufferPoolPageNumber, the pool only 
    //limits memory usage in mycat-js. Note that it doesn't include chunk size, chunk
    //size is the allocation unit!
	// Minimum allocation unit
	#bufferPoolChunkSize = SystemConfig.#DEFAULT_BUFFER_CHUNK_SIZE;
	// A page size
	#bufferPoolPageSize = SystemConfig.#DEFAULT_BUFFER_POOL_PAGE_SIZE;
	// Buffer pool page number
	#bufferPoolPageNumber = SystemConfig.#DEFAULT_PROCESSORS * 64; // eg. 256 in 4 CPUs
    // Buffer percent per local processor
    #processorBufferLocalPercent = 100;

	// Big resultSet threshold, default 512kb
	#maxResultSet = 512 * 1024;
	// Big resultSet deny policy times filter limit, default times 10
	#bigResultSizeSqlCount = 10;
	// Buffer pool usage threshold(0-100), default 80%
	#bufferUsagePercent = 80;
	// Big resultSet protection policy,
    // 0: off, 1: when usage of MyCat buffer pool is great than bufferUsagePercent, 
    // deny all SQL that exceeds defaultBigResultSizeSqlCount and maxResultSet.
	// Default 0.
	#flowControlRejectStrategy = 0;
	// The period of cleanup big resultSet record
	#clearBigSqLResultSetMapMs = 10 * 60 * 1000;
    #defaultMaxLimit = SystemConfig.#DEFAULT_MAX_LIMIT;

	#ignoreUnknownCommand = 0;
    #defaultSqlParser = SystemConfig.#DEFAULT_SQL_PARSER;

    #sqlInterceptor = 'io.mycat.server.interceptor.impl.DefaultSqlInterceptor';
	#sqlInterceptorType = 'SELECT';
	#sqlInterceptorFile = path.join(process.cwd(), 'logs', 'sql.txt');

    #multiNodeLimitType = SystemConfig.#MULTI_NODE_LIMIT_SMALL_DATA;
	#multiNodePatchSize = SystemConfig.#MULTI_NODE_LIMIT_PATCH_SIZE;

    #usingAIO = 0;
	#packetHeaderSize = 4;
	#maxPacketSize = 16 * 1024 * 1024;
	#mycatNodeId = 1;
	#useCompression =0;	
	#useSqlStat = 1;
	#subqueryRelationshipCheck = false;
	
	// 1: HandshakeV10Packet(compatible with high version), 0: HandshakePacket.
	#useHandshakeV10 = 0;
    #handleDistributedTransactions = 0;
    #checkTableConsistency = 0;
    #checkTableConsistencyPeriod = SystemConfig.#CHECK_TABLE_CONSISTENCY_PERIOD;

    #processorBufferPoolType = 0;
	#useGlobalTableCheck = 1;
	#globalTableCheckPeriod = SystemConfig.#DEFAULT_GLOBAL_TABLE_CHECK_PERIOD;

	#strictTxIsolation = false;
    // OffHeap for Merge:  1-on，0-off
	#useOffHeapForMerge = 0;
    // Page size, unit M
	#memoryPageSize = SystemConfig.#MEMORY_PAGE_SIZE;
    #spillsFileBufferSize = SystemConfig.#SPILLS_FILE_BUFFER_SIZE;
    #useStreamOutput = 0;
    #systemReserveMemorySize = SystemConfig.#RESERVED_SYSTEM_MEMORY_BYTES;
    #XARecoveryLogBaseDir = path.join(SystemConfig.homePath, 'tmlogs');
    #XARecoveryLogBaseName = 'tmlog';
    #dataNodeSortedTempDir = process.cwd();

    #useZKSwitch = SystemConfig.#DEFAULT_USE_ZK_SWITCH;
    #nonePasswordLogin = SystemConfig.#DEFAULT_NONE_PASSWORD_LOGIN;
    #parallExecute = 0;
	#enableWriteQueueFlowControl = false;
    #writeQueueStopThreshold = 10 * 1024;
    #writeQueueRecoverThreshold = 512;

    constructor() {
        
    }

    /** The frontend connection authentication timeout,  default 15s, unit second. 
     * The connection will be closed if auth time exceeds this value. 0 or a negative 
     * value means no timeout. */
    get authTimeout() {
        return this.#authTimeout;
    }

    set authTimeout(timeout) {
        this.#authTimeout = TypeHelper.parseIntDecimal(timeout, 'authTimeout');
    }

    /** MyCat network connection charset, default utf8. MyCat uses the 
     * charset to encode string into network byte stream, or decode
     * network byte stream as string.
    */
     get charset() {
        return this.#charset;
    }

    set charset(cs) {
        this.#charset = StringHelper.ensureNotBlank(cs, 'charset');
    }

    /** SQL parser, currently only 'myparser' supported. */
    get defaultSqlParser() {
        return this.#defaultSqlParser;
    }

    set defaultSqlParser(parser) {
        TypeHelper.ensureString(parser, 'defaultSqlParser');
        const def = SystemConfig.#DEFAULT_SQL_PARSER;
        if (parser === '' || parser === def) {
            this.#defaultSqlParser = def;
        } else {
            console.warn(`SQL parser '%s' not used. Using default '%s'`, parser, def);
        }
    }

    /** Mycat listen IP, default '0.0.0.0'. */
    get bindIp() {
        return this.#bindIp;
    }

    set bindIp(ip) {
        this.#bindIp = StringHelper.ensureNotBlank(ip, 'bindIp');
    }

    /** MyCat server listen port, default 8066. */
    get serverPort() { 
        return this.#serverPort;
    }

    set serverPort(port) {
        let p = TypeHelper.parseIntDecimal(port, 'serverPort');
        this.#serverPort = NetHelper.ensurePort(p);
    }

    /** MyCat manager listen port, default 9066. */
    get managerPort() { 
        return this.#managerPort;
    }

    set managerPort(port) {
        let p = TypeHelper.parseIntDecimal(port, 'managerPort');
        this.#managerPort = NetHelper.ensurePort(p);
    }

    get serverBacklog() {
        return this.#serverBacklog;
    }

    set serverBacklog(backlog) {
        let n = TypeHelper.parseIntDecimal(backlog, 'serverBacklog');
        if (n > 0) {
            this.#serverBacklog = n;
        } else {
            throw new ConfigError(`serverBacklog ${n} less than 1`);
        }
    }

    /** Processor count, control how many worker threads used, default CPU number. */
    get processors() {
        return this.#processors;
    }

    set processors(processors) {
        let n = TypeHelper.parseIntDecimal(processors, 'processors');
        if (n > 0) {
            this.#processors = n;
        } else {
            throw new ConfigError(`processors ${n} less than 1`);
        }
    }

    /** Buffer pool chunk size, the allocation unit, default 4096 byte. */
    get bufferPoolChunkSize() {
        return this.#bufferPoolChunkSize;
    }

    set bufferPoolChunkSize(size) {
        let n = TypeHelper.parseIntDecimal(size, 'bufferPoolChunkSize');
        if (n > 0) {
            this.#bufferPoolChunkSize = n;
        } else {
            throw new ConfigError(`bufferPoolChunkSize ${n} less than 1`);
        }
    }

    /** Buffer pool chunk size, an alias of the bufferPoolChunkSize. */
    get processorBufferChunk() {
        return this.bufferPoolChunkSize;
    }

    set processorBufferChunk(size) {
        let n = TypeHelper.parseIntDecimal(size, 'processorBufferChunk');
        if (n > 0) {
            this.#bufferPoolChunkSize = n;
        } else {
            throw new ConfigError(`processorBufferChunk ${n} less than 1`);
        }
    }

    /** Buffer pool page size, default 4m. */
    get bufferPoolPageSize() {
        return this.#bufferPoolPageSize;
    }

    set bufferPoolPageSize(size) {
        let n = TypeHelper.parseIntDecimal(size, 'bufferPoolPageSize');
        if (n > 0) {
            this.#bufferPoolPageSize = n;
        } else {
            throw new ConfigError(`bufferPoolPageSize ${n} less than 1`);
        }
    }

     /** Buffer pool page number, default CPU number x 64. */
    get bufferPoolPageNumber() {
        return this.#bufferPoolPageNumber;
    }

    set bufferPoolPageNumber(num) {
        let n = TypeHelper.parseIntDecimal(num, 'bufferPoolPageNumber');
        if (n > 0) {
            this.#bufferPoolPageNumber = n;
        } else {
            throw new ConfigError(`bufferPoolPageNumber ${n} less than 1`);
        }
    }

    /** Buffer pool size, limits max buffer usage in mycat-js. */
    get processorBufferPool() {
        return this.bufferPoolPageNumber * this.bufferPoolPageSize;
    }

    /** Buffer percent per local processor, default 100. Only one processor in
     * mycat-js, so please keep it default.
     */
    get processorBufferLocalPercent() {
        return this.#processorBufferLocalPercent;
    }

    set processorBufferLocalPercent(percent) {
        let n = TypeHelper.parseIntDecimal(percent, 'processorBufferLocalPercent');
        if (n === 100) {
            this.#processorBufferLocalPercent = n;
        } else {
            console.warn(`processorBufferLocalPercent ${n} not used, keep it default 100.`);
        }
    }

    /** Processor background task coroutines count. */
    get processorExecutor() {
        return this.#processorExecutor;
    }

    set processorExecutor(num) {
        let n = TypeHelper.parseIntDecimal(num, 'processorExecutor');
        if (n > 0) {
            this.#processorExecutor = n;
        } else {
            throw new ConfigError(`processorExecutor ${n} less than 0`);
        }
    }

    /** Global sequence type. */
    get sequenceHandlerType() {
        return this.#sequenceHandlerType;
    }

    set sequenceHandlerType(type) {
        let n = TypeHelper.parseIntDecimal(type, 'sequenceHandlerType');
        switch (n) {
            case SystemConfig.#SEQUENCE_HANDLER_LOCAL_FILE:
            case SystemConfig.#SEQUENCE_HANDLER_MYSQL_DB:
            case SystemConfig.#SEQUENCE_HANDLER_LOCAL_TIME:
            case SystemConfig.#SEQUENCE_HANDLER_ZK_DISTRIBUTED:
            case SystemConfig.#SEQUENCE_HANDLER_ZK_GLOBAL_INCREMENT:
            case SystemConfig.#SEQUENCE_HANDLER_DEF_GLOBAL_INCREMENT:
                this.#sequenceHandlerType = n;
                break;
            default:
                throw new ConfigError(`sequenceHandlerType ${n} unknown!`);
        }
    }

    /** Global sequence type. 'sequnceHandlerType' spelling mistake. */
    get sequnceHandlerType() {
        return this.sequenceHandlerType;
    }

    set sequnceHandlerType(type) {
        let n = TypeHelper.parseIntDecimal(type, 'sequnceHandlerType');
        switch (n) {
            case SystemConfig.#SEQUENCE_HANDLER_LOCAL_FILE:
            case SystemConfig.#SEQUENCE_HANDLER_MYSQL_DB:
            case SystemConfig.#SEQUENCE_HANDLER_LOCAL_TIME:
            case SystemConfig.#SEQUENCE_HANDLER_ZK_DISTRIBUTED:
            case SystemConfig.#SEQUENCE_HANDLER_ZK_GLOBAL_INCREMENT:
            case SystemConfig.#SEQUENCE_HANDLER_DEF_GLOBAL_INCREMENT:
                this.#sequenceHandlerType = n;
                break;
            default:
                throw new ConfigError(`sequnceHandlerType ${n} unknown!`);
        }
    }

    get frontSocketSoRcvbuf() {
        return this.#frontSocketSoRcvbuf;
    }

    set frontSocketSoRcvbuf(size) {
        let n = TypeHelper.parseIntDecimal(size, 'frontSocketSoRcvbuf');
        if (n > 0) {
            this.#frontSocketSoRcvbuf = n;
        } else {
            throw new ConfigError(`frontSocketSoRcvbuf ${n} less than 0`);
        }
    }

    get frontSocketSoSndbuf() {
        return this.#frontSocketSoSndbuf;
    }

    set frontSocketSoSndbuf(size) {
        let n = TypeHelper.parseIntDecimal(size, 'frontSocketSoSndbuf');
        if (n > 0) {
            this.#frontSocketSoSndbuf = n;
        } else {
            throw new ConfigError(`frontSocketSoSndbuf ${n} less than 0`);
        }
    }

    get frontSocketNoDelay() {
        return this.#frontSocketNoDelay;
    }

    set frontSocketNoDelay(noDelay) {
        this.#frontSocketNoDelay = TypeHelper.parseIntDecimal(noDelay, 'frontSocketNoDelay');
    }

    get backSocketSoRcvbuf() {
        return this.#backSocketSoRcvbuf;
    }

    set backSocketSoRcvbuf(size) {
        let n = TypeHelper.parseIntDecimal(size, 'backSocketSoRcvbuf');
        if (n > 0) {
            this.#backSocketSoRcvbuf = n;
        } else {
            throw new ConfigError(`backSocketSoRcvbuf ${n} less than 0`);
        }
    }

    get backSocketSoSndbuf() {
        return this.#backSocketSoSndbuf;
    }

    set backSocketSoSndbuf(size) {
        let n = TypeHelper.parseIntDecimal(size, 'backSocketSoSndbuf');
        if (n > 0) {
            this.#backSocketSoSndbuf = n;
        } else {
            throw new ConfigError(`backSocketSoSndbuf ${n} less than 0`);
        }
    }

    get backSocketNoDelay() {
        return this.#backSocketNoDelay;
    }

    set backSocketNoDelay(noDelay) {
        this.#backSocketNoDelay = TypeHelper.parseIntDecimal(noDelay, 'backSocketNoDelay');
    }

    /** MySQL protocol header size 4. Don't set it! */
    get packetHeaderSize() {
        return this.#packetHeaderSize;
    }

    set packetHeaderSize(size) {
        let n = TypeHelper.parseIntDecimal(size, 'packetHeaderSize');
        if (n === 4) {
            this.#packetHeaderSize = n;
        } else {
            throw new ConfigError(`Please keep packetHeaderSize 4`);
        }
    }

    /** MySQL protocol max packet size, default 16m. */
    get maxPacketSize() {
        return this.#maxPacketSize;
    }

    set maxPacketSize(size) {
        let n = TypeHelper.parseIntDecimal(size, 'maxPacketSize');
        if (n > 0) {
            this.#maxPacketSize = n;
        } else {
            throw new ConfigError(`maxPacketSize ${n} less than 0`);
        }
    }

    /** The frontend/backend connection max idle timeout, default 30min, and 
     * unit millisecond. If a connection idle time reaches this, it will be closed. 
     * 0 or negative value means no timeout for ever. */
    get idleTimeout() {
        return this.#idleTimeout;
    }

    set idleTimeout(timeout) {
        this.#idleTimeout = TypeHelper.parseIntDecimal(timeout, 'idleTimeout');
    }

    /** The init transaction isolation level of the frontend connection. */
    get txIsolation() {
        return this.#txIsolation;
    }

    set txIsolation(level) {
        let n = TypeHelper.parseIntDecimal(level, 'txIsolation');
        switch (n) {
            case Isolation.READ_UNCOMMITTED:
            case Isolation.READ_COMMITTED:
            case Isolation.REPEATED_READ:
            case Isolation.SERIALIZABLE:
                this.#txIsolation = n;
                break;
            default:
                throw new ConfigError(`txIsolation ${n} unknown!`);
        }
    }

    /** SQL execution timeout, default 300s, unit second. If a SQL execution time 
     * exceeds this value, the connection will be closed. 0 or negative value means
     * no timeout for ever.
     */
    get sqlExecuteTimeout() {
        return this.#sqlExecuteTimeout;
    }

    set sqlExecuteTimeout(timeout) {
        this.#sqlExecuteTimeout = TypeHelper.parseIntDecimal(timeout, 'sqlExecuteTimeout');
    }

    /** Check processor period for connection idle or sql timeout, 
     * default 1s, unit millisecond. */
    get processorCheckPeriod() {
        return this.#processorCheckPeriod;
    }

    set processorCheckPeriod(period) {
        let n = TypeHelper.parseIntDecimal(period, 'processorCheckPeriod');
        if (n > 0) {
            this.#processorCheckPeriod = n;
        } else {
            throw new ConfigError(`processorCheckPeriod ${n} less than 1`);
        }
    }

    /** The check period for backend connection idle or sql timeout, 
     * default 300s, unit millisecond.
     */
    get dataNodeIdleCheckPeriod() {
        return this.#dataNodeIdleCheckPeriod;
    }

    set dataNodeIdleCheckPeriod(period) {
        let n = TypeHelper.parseIntDecimal(period, 'dataNodeIdleCheckPeriod');
        if (n > 0) {
            this.#dataNodeIdleCheckPeriod = n;
        } else {
            throw new ConfigError(`dataNodeIdleCheckPeriod ${n} less than 1`);
        }
    }

    /** Heartbeat period for backend read/write database, 
     * default 10s, unit millisecond. */
    get dataNodeHeartbeatPeriod() {
        return this.#dataNodeHeartbeatPeriod;
    }

    set dataNodeHeartbeatPeriod(period) {
        let n = TypeHelper.parseIntDecimal(period, 'dataNodeHeartbeatPeriod');
        if (n > 0) {
            this.#dataNodeHeartbeatPeriod = n;
        } else {
            throw new ConfigError(`dataNodeHeartbeatPeriod ${n} less than 1`);
        }
    }

    /** MySQL fake version, default '5.6'. */
    get fakeMySQLVersion() {
        return this.#fakeMySQLVersion;
    }

    set fakeMySQLVersion(version) {
        this.#fakeMySQLVersion = StringHelper.ensureNotBlank(version, 'fakeMySQLVersion');
    }

    /** A flag of checking global table consistency, 1 check, and 0 not check. */
    get useGlobalTableCheck() {
        return this.#useGlobalTableCheck;
    }

    set useGlobalTableCheck(check) {
        let n = TypeHelper.parseIntDecimal(check, 'useGlobalTableCheck');
        if (n === 1 || n === 0) {
            this.#useGlobalTableCheck = n;
        } else {
            throw new ConfigError(`useGlobalTableCheck ${n} not 0 or 1`);
        }
    }

    /** A switch for distributed transactions, 
     * a) 0 off;
     * b) 1 on(not all global table tx);
     * c) 2 off, and logging tx. */
    get handleDistributedTransactions() {
        return this.#handleDistributedTransactions;
    }

    set handleDistributedTransactions(handle) {
        let n = TypeHelper.parseIntDecimal(handle, 'handleDistributedTransactions');
        if (n === 0 || n === 1 || n === 2) {
            this.#handleDistributedTransactions = n;
        } else {
            throw new ConfigError(`handleDistributedTransactions ${n} unknown!`);
        }
    }

    /** A flag of using off heap for merge/order by/group by/limit 
     * operations, 1 on, 0 off, default 0. */
    get useOffHeapForMerge() {
        return this.#useOffHeapForMerge;
    }

    set useOffHeapForMerge(use) {
        let n = TypeHelper.parseIntDecimal(use, 'useOffHeapForMerge');
        if (n === 0 || n === 1) {
            this.#useOffHeapForMerge = n;
            console.warn('useOffHeapForMerge %s not used', n);
        } else {
            throw new ConfigError(`useOffHeapForMerge ${n} unknown!`);
        }
    }

    // Static properties or methods
    static getProperty(prop, def) {
        const value = this.#ARGV.props[prop];
        if (value === undefined) return def;
        else return value;
    }

    static setProperty(prop, value) {
        const props = this.#ARGV.props;
        let old = props[prop];
        props[prop] = value;
        return old;
    }

    static get logFileDisabled() {
        return !!this.getProperty(this.#PROP_LOG_FILE_DISABLED);
    }

    static get SYS_HOME() {
        return this.#PROP_SYS_HOME;
    }

    static get DEFAULT_POOL_SIZE() {
        return 128;
    }

    static get ENCODING() {
        return 'utf-8';
    }

    static get confPath() {
        return path.join(this.homePath, 'conf');
    }

    static get logsPath() {
        return path.join(this.homePath, 'logs');
    }

    static get homePath() {
        // Home path lookup: argv, env, cwd, BIN
        const prop = this.SYS_HOME;
        const props = this.#ARGV.props;
        let home = props[prop];
        if (home) return home;
        
        const env = process.env;
        home = env[prop];
        if (home) return props[prop] = home;

        home = process.cwd();
        let conf = path.join(home, "conf");
        try {
            if (fs.stat(conf).isDirectory()) 
                return props[prop] = home;
        } catch (e) {
            if (e.code != 'ENOENT') throw e;
        }

        home = path.join(__dirname, '..');
        conf = path.join(home, "conf");
        try {
            if (fs.stat(conf).isDirectory()) 
                return props[prop] = home;
        } catch (e) {
            if (e.code != 'ENOENT') throw e;
        }
         
        return null;
    }

    static get enableTestDebug() {
        const props = this.#ARGV.props;
        return !!props['enable-test-debug'];
    }

    static resetLogger() {
        console.reset();

        const consDisabled = this.getProperty('disable-log-console', false);
        if (!consDisabled) console.add('console');
        if (this.logFileDisabled) return;

        let level = this.getProperty('log-file-level', 'INFO');
        level = parseLevel(level);
        
        const home = this.homePath;
        const dir = path.join(home, 'logs');
        const file = path.join(dir, 'mycat-%s.log');
        if (!fs.existsSync(dir)) fs.mkdir(dir);

        const split = this.getProperty('log-file-split', '10m');
        let count = this.getProperty('log-file-max');
        count = parseInt(count);
        if (isNaN(count)) count = 10;
        
        console.add({
            type: 'file',
            levels: [level],
            path: file,
            // Optional: 'day', 'hour', 'minute', '###k', '###m', '###g'，default '1m'
            split: split,
            // Optional: 2-128，default 128
            count: count
        });

        function parseLevel(level) {
            level = level.toUpperCase();
            switch(level) {
                case 'FATAL':
                    return console.FATAL;
                case 'ALERT':
                    return console.ALERT;
                case 'CRIT':
                    return console.CRIT;
                case 'ERROR':
                    return console.ERROR;
                case 'WARN':
                    return console.WARN;
                case 'INFO':
                    return console.INFO;
                case 'DEBUG':
                    return console.DEBUG;
                case 'PRINT':
                    return console.PRINT;
                case 'NOTSET':
                    return console.NOTSET;
                default:
                    return console.INFO;
            }
        }
    }
}

function parseArgv() {
    // argv format: -Da=1 -Db=2 -Dt x y z 
    const argv = process.argv;
    const n = argv.length;
    const props = {};
    const args = [];

    for (let i = 2; i < n; ++i) {
        const arg = argv[i];
        if (arg.startsWith('-D')) {
            let prop = arg.slice(2);
            let j = prop.indexOf('=');
            if (j == -1) {
                props[prop] = true; // bool flag
                continue;
            }

            let val = prop.slice(j + 1);
            prop = prop.slice(0, j);
            props[prop] = val;
        } else {
            args.push(arg);
        }
    }

    return { props, args };
}

module.exports = SystemConfig;
