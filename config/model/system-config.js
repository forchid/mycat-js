const Isolation = require('../isolation');
const process = require('process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class SystemConfig {

    static #ARGV = parseArgv(); //{ props: {}, args: [] };
    static #PROP_SYS_HOME = 'MYCAT_HOME';
    static #PROP_LOG_FILE_DISABLED = 'disable-log-file';
    static #DEFAULT_PORT = 8066;
    static #DEFAULT_MANAGER_PORT = 9066;
    static #DEFAULT_CHARSET = 'utf8';
    static #DEFAULT_SQL_PARSER = 'mycatparser';
    static #DEFAULT_BUFFER_CHUNK_SIZE = 4096;
    static #DEFAULT_BUFFER_POOL_PAGE_SIZE = 512 * 1024 * 4;
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
    #serverPort = SystemConfig.#DEFAULT_PORT;
    #managerPort = SystemConfig.#DEFAULT_MANAGER_PORT;
    #serverBacklog = 2048;
	#charset = SystemConfig.#DEFAULT_CHARSET;
	#processors = SystemConfig.#DEFAULT_PROCESSORS;
	#processorExecutor = 0;
    
    #removeGraveAccent = 0;

    #frontSocketSoRcvbuf = 1024 * 1024;
	#frontSocketSoSndbuf = 4 * 1024 * 1024;
    #frontSocketNoDelay = 1; // 0=false
    #frontWriteQueueSize = 2048;
    #fakeMySQLVersion = '';

    #backSocketSoSndbuf = 1024 * 1024;
	#backSocketSoRcvbuf = 4 * 1024 * 1024; // mysql 5.6 net_buffer_length defaut 4M
	#backSocketNoDelay = 1; // 1=true

    #maxStringLiteralLength = 65535;
    #processorBufferLocalPercent = 0;
    #timerExecutor = 0;
	#managerExecutor = 0;
	#idleTimeout = 0;
	#authTimeout = SystemConfig.#DEFAULT_AUTH_TIMEOUT;
	#catletClassCheckSeconds = 60;
	// sql execute timeout (second)
	#sqlExecuteTimeout = 300;
	#processorCheckPeriod = 0;
    #dataNodeIdleCheckPeriod = SystemConfig.#DEFAULT_DATA_NODE_IDLE_CHECK_PERIOD;
	#dataNodeHeartbeatPeriod = SystemConfig.#DEFAULT_DATA_NODE_HEARTBEAT_PERIOD;
	#clusterHeartbeatUser = '';
	#clusterHeartbeatPass = '';
	#clusterHeartbeatPeriod = SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_PERIOD;
	#clusterHeartbeatTimeout= SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_TIMEOUT;
	#clusterHeartbeatRetry = SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_RETRY;
	#txIsolation = 0;
	#parserCommentVersion = SystemConfig.#DEFAULT_PARSER_COMMENT_VERSION;
    #sqlRecordCount = 0;
	#sequenceHandlerPattern = SystemConfig.#SEQUENCE_HANDLER_PATTERN;
    #sequenceHandlerType = SystemConfig.#SEQUENCE_HANDLER_LOCAL_FILE;
    #sequenceMySqlRetryCount = SystemConfig.#DEFAULT_SEQUENCE_MYSQL_RETRY_COUNT;
    #sequenceMySqlWaitTime = SystemConfig.#DEFAULT_SEQUENCE_MYSQL_WAIT_TIME;

	#maxPreparedStmtCount = 0;
	// A page size
	#bufferPoolPageSize = 0;
	// Minimum allocation unit
	#bufferPoolChunkSize = 0;
	// Buffer pool page number 
	#bufferPoolPageNumber = 0;
	// Big resultSet threshold, default 512kb
	#maxResultSet=512*1024;
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
	#sqlInterceptorFile = path.join(os.homedir(), 'logs', 'sql.txt');

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
	#useOffHeapForMerge;
    // Page size, unit M
	#memoryPageSize = '';
    #spillsFileBufferSize = '';
    #useStreamOutput = 0;
    #systemReserveMemorySize = '';
    #XARecoveryLogBaseDir = '';
    #XARecoveryLogBaseName = '';
    #dataNodeSortedTempDir = '';

    #useZKSwitch = SystemConfig.#DEFAULT_USE_ZK_SWITCH;
    #nonePasswordLogin = SystemConfig.#DEFAULT_NONE_PASSWORD_LOGIN;
    #parallExecute = 0;
	#enableWriteQueueFlowControl = false;
    #writeQueueStopThreshold = 0;
    #writeQueueRecoverThreshold = 0;

    constructor() {
        this.#serverPort = SystemConfig.#DEFAULT_PORT;
		this.#managerPort = SystemConfig.#DEFAULT_MANAGER_PORT;
		this.#charset = SystemConfig.#DEFAULT_CHARSET;
		this.#processors = SystemConfig.#DEFAULT_PROCESSORS;

		this.#bufferPoolPageSize = SystemConfig.#DEFAULT_BUFFER_POOL_PAGE_SIZE;
		this.#bufferPoolChunkSize = SystemConfig.#DEFAULT_BUFFER_CHUNK_SIZE;
		this.#bufferPoolPageNumber = SystemConfig.#DEFAULT_PROCESSORS * 20;

		this.#processorExecutor = (SystemConfig.#DEFAULT_PROCESSORS != 1) ? 
            SystemConfig.#DEFAULT_PROCESSORS * 2 : 4;
		this.#managerExecutor = 2;

		this.#processorBufferLocalPercent = 100;
		this.#timerExecutor = 2;
		this.#idleTimeout = SystemConfig.#DEFAULT_IDLE_TIMEOUT;
		this.#authTimeout = SystemConfig.#DEFAULT_AUTH_TIMEOUT;
		this.#processorCheckPeriod = SystemConfig.#DEFAULT_PROCESSOR_CHECK_PERIOD;
		this.#dataNodeIdleCheckPeriod = SystemConfig.#DEFAULT_DATA_NODE_IDLE_CHECK_PERIOD;
		this.#dataNodeHeartbeatPeriod = SystemConfig.#DEFAULT_DATA_NODE_HEARTBEAT_PERIOD;
		this.#clusterHeartbeatUser = SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_USER;
		this.#clusterHeartbeatPass = SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_PASS;
		this.#clusterHeartbeatPeriod = SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_PERIOD;
		this.#clusterHeartbeatTimeout = SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_TIMEOUT;
		this.#clusterHeartbeatRetry = SystemConfig.#DEFAULT_CLUSTER_HEARTBEAT_RETRY;
		this.#txIsolation = Isolation.REPEATED_READ;
		this.#parserCommentVersion = SystemConfig.#DEFAULT_PARSER_COMMENT_VERSION;
		this.#sqlRecordCount = SystemConfig.#DEFAULT_SQL_RECORD_COUNT;
		this.#globalTableCheckPeriod = SystemConfig.#DEFAULT_GLOBAL_TABLE_CHECK_PERIOD;
		this.#useOffHeapForMerge = 0;
		this.#memoryPageSize = SystemConfig.#MEMORY_PAGE_SIZE;
		this.#spillsFileBufferSize = SystemConfig.#SPILLS_FILE_BUFFER_SIZE;
		this.#useStreamOutput = 0;
		this.#systemReserveMemorySize = SystemConfig.#RESERVED_SYSTEM_MEMORY_BYTES;
		this.#dataNodeSortedTempDir = os.homedir();
		this.#XARecoveryLogBaseDir = path.join(SystemConfig.homePath, 'tmlogs');
		this.#XARecoveryLogBaseName = 'tmlog';

		this.#maxPreparedStmtCount = SystemConfig.#DEFAULT_MAX_PREPARED_STMT_COUNT;
		this.#ignoreUnknownCommand = 0;
		this.#parallExecute = 0;
		this.#removeGraveAccent = 1;

        // Flow control
        this.#enableWriteQueueFlowControl = false;
        this.#writeQueueStopThreshold = 10 * 1024;
        this.#writeQueueRecoverThreshold = 512;
    }

    get serverPort() { return this.#serverPort; }

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
