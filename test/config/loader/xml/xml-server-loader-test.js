const runIf = require('../../../run-if');
const XmlServerLoader = require('../../../../config/loader/xml/xml-server-loader');

const path = require('path');

runIf(__filename, run);

function run() {
    describe('XmlServerLoader', () => {
        let serverFile = path.join(__dirname, 'server.xml');
        const loader = new XmlServerLoader(serverFile);

        it ('load system properties', () => {
            const sys = loader.system;
            
            assert.equal(1, sys.nonePasswordLogin);
            assert.equal(1, sys.ignoreUnknownCommand);
            assert.equal(0, sys.removeGraveAccent);
            assert.equal(1, sys.useSqlStat);
            assert.equal(0, sys.useGlobalTableCheck);
            assert.equal(1, sys.useHandshakeV10);
            assert.equal(1800, sys.sqlExecuteTimeout);
            assert.equal('(?:(\\s*next\\s+value\\s+for\\s*MYCATSEQ_(\\w+))(,|\\)|\\s)*)+', 
                sys.sequenceHandlerPattern);
            assert.equal('(?:(\\s*next\\s+value\\s+for\\s*MYCATSEQ_(\\w+))(,|\\)|\\s)*)+', 
                sys.sequnceHandlerPattern);
            assert.equal(false, sys.subqueryRelationshipCheck);
            assert.equal('io.mycat.route.sequence.handler.HttpIncrSequenceHandler', 
                sys.sequenceHandlerClass);

            assert.equal(0, sys.useCompression);
            assert.equal('5.7', sys.fakeMySQLVersion);
            assert.equal(40960, sys.processorBufferChunk);
            assert.equal(40960, sys.bufferPoolChunkSize);
            assert.equal(8, sys.processors);
            assert.equal(64, sys.processorExecutor);
            assert.equal(1, sys.processorBufferPoolType);
            assert.equal(10240, sys.maxStringLiteralLength);
            assert.equal(1, sys.backSocketNoDelay);
            assert.equal(1, sys.frontSocketNoDelay);
            assert.equal(8166, sys.serverPort);

            assert.equal(9166, sys.managerPort);
            assert.equal(3600000, sys.idleTimeout);
            assert.equal(5000, sys.authTimeout);
            assert.equal('127.0.0.1', sys.bindIp);
            assert.equal(180000, sys.dataNodeIdleCheckPeriod);
            assert.equal(2048, sys.frontWriteQueueSize);
            assert.equal(2, sys.handleDistributedTransactions);
            assert.equal(0, sys.useOffHeapForMerge);
            assert.equal('64k', sys.memoryPageSize);
            assert.equal('1k', sys.spillsFileBufferSize);

            assert.equal(0, sys.useStreamOutput);
            assert.equal('512m', sys.systemReserveMemorySize);
            assert.equal(true, sys.useZKSwitch);
            assert.equal('./xa', sys.XARecoveryLogBaseDir);
            assert.equal('tmlog', sys.XARecoveryLogBaseName);
            assert.equal(true, sys.strictTxIsolation);
            assert.equal(1, sys.parallExecute);
            assert.equal(10000, sys.serverBacklog);
            assert.equal('gbk', sys.charset);
            assert.equal(2, sys.txIsolation);
        });
    });
}

module.exports = run;
