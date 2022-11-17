const runIf = require('../../../run-if');
const XmlServerLoader = require('../../../../config/loader/xml/xml-server-loader');

const path = require('path');
const UserConfig = require('../../../../config/model/user-config');
const UserPrivilegesConfig = require('../../../../config/model/user-privileges-config');
const SchemaPrivilege = require('../../../../config/model/priv/schema-privilege');
const TablePrivilege = require('../../../../config/model/priv/table-privilege');
const DataNodePrivilege = require('../../../../config/model/priv/data-node-privilege');
const FirewallConfig = require('../../../../config/model/firewall-config');

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

        it ('load users', () => {
            const users = loader.users;
            assert.ok(users instanceof Map);
            for (let [key, value] of users) {
                assert.ok(value instanceof UserConfig);
                let user = value;
                let privileges = user.privilegesConfig;
                assert.ok(privileges instanceof UserPrivilegesConfig);
                let schPrivileges = privileges.schemaPrivileges;
                assert.ok(schPrivileges instanceof Map);
                let dnPrivileges = privileges.dataNodePrivileges;
                assert.ok(dnPrivileges instanceof Map);
                switch (key) {
                    case 'root':
                        assert.equal(key, user.name);
                        assert.equal('123456', user.password);
                        assert.equal('', user.encryptPassword);
                        assert.equal(1000, user.benchmark);
                        assert.equal(true, user.defaultAccount);
                        assert.equal(false, user.readOnly);
                        assert.equal('TESTDB', user.defaultSchema);
                        assert.ok(user.schemas instanceof Set);
                        assert.equal(1, user.schemas.size);
                        user.schemas.forEach(sch => assert.equal('TESTDB', sch));
                        // Priv
                        assert.ok(privileges.check);
                        assert.equal(1, schPrivileges.size);
                        assert.equal(2, dnPrivileges.size);
                        // Schema priv
                        for (let [key, value] of schPrivileges) {
                            assert.ok(value instanceof SchemaPrivilege);
                            let schPriv = value;
                            switch(key) {
                                case 'TESTDB':
                                    assert.equal(key, schPriv.name);
                                    assert.equal(4, schPriv.dml.length);
                                    assert.equal('0110', schPriv.dmlText);
                                    // Tab priv
                                    let tabPriv = schPriv.getTablePrivilege('tb01');
                                    assert.ok(tabPriv instanceof TablePrivilege);
                                    assert.equal('tb01', tabPriv.name);
                                    assert.equal(4, tabPriv.dml.length);
                                    assert.equal('0000', tabPriv.dmlText);

                                    tabPriv = schPriv.getTablePrivilege('tb02');
                                    assert.ok(tabPriv instanceof TablePrivilege);
                                    assert.equal('tb02', tabPriv.name);
                                    assert.equal(4, tabPriv.dml.length);
                                    assert.equal('1111', tabPriv.dmlText);
                                    break;
                                default:
                                    throw new Error(`schema '${key}'?`);
                            }
                        }
                        // DataNode priv
                        for (let [key, value] of dnPrivileges) {
                            assert.ok(value instanceof DataNodePrivilege);
                            let dnPriv = value;
                            switch(key) {
                                case 'dn0':
                                    assert.equal(key, dnPriv.name);
                                    assert.equal(4, dnPriv.dml.length);
                                    assert.equal('0001', dnPriv.dmlText);
                                    break;
                                case 'dn1':
                                    assert.equal(key, dnPriv.name);
                                    assert.equal(4, dnPriv.dml.length);
                                    assert.equal('1001', dnPriv.dmlText);
                                    break;
                                default:
                                    throw new Error(`dataNode '${key}'?`);
                            }
                        }
                        break;
                    case 'test':
                        assert.equal(key, user.name);
                        assert.equal('test', user.password);
                        assert.equal('', user.encryptPassword);
                        assert.equal(0, user.benchmark);
                        assert.equal(false, user.defaultAccount);
                        assert.equal(true, user.readOnly);
                        assert.equal('TESTDB', user.defaultSchema);
                        assert.ok(user.schemas instanceof Set);
                        assert.equal(1, user.schemas.size);
                        user.schemas.forEach(sch => assert.equal('TESTDB', sch));
                        // Priv
                        assert.ok(!privileges.check);
                        assert.equal(0, schPrivileges.size);
                        assert.equal(0, dnPrivileges.size);
                        break;
                    default:
                        throw new Error(`user '${key}'?`);
                }
            }
        });

        it ('load firewall', () => {
            const firewall = loader.firewall;
            assert.ok(!firewall.check);
            const whiteHosts = firewall.whiteHosts;
            assert.equal(1, whiteHosts.size);
            const whiteHostMasks = firewall.whiteHostMasks;
            assert.equal(4, whiteHostMasks.size);
            assert.equal(0, firewall.blacklist.length);

            for (let [key, value] of whiteHosts) {
                assert.ok(typeof key == 'string' || key instanceof String);
                assert.ok(value instanceof Array);
                const host = key;
                const users = value;
                const n = users.length;
                assert.equal(2, n);
                switch (host) {
                    case '192.168.1.99':
                        for (let i = 0; i < n; ++i) {
                            let user = users[i];
                            switch(user.name) {
                                case 'root':
                                case 'test':
                                    break;
                                default:
                                    throw new Error(`host user '${user.name}'?`);
                            }
                        }
                        break;
                    default:
                        throw new Error(`host '${host}'?`);
                }
            }

            for (let [key, value] of whiteHostMasks) {
                assert.ok(key instanceof RegExp);
                assert.ok(value instanceof Array);
                const users = value;
                const n = users.length;
                let host = FirewallConfig.createHostMask(key);
                switch(host) {
                    case '127.0.0.*':
                        assert.equal(2, n);
                        for (let i = 0; i < n; ++i) {
                            let user = users[i];
                            switch(user.name) {
                                case 'root':
                                case 'test':
                                    break;
                                default:
                                    throw new Error(`host user '${user.name}'?`);
                            }
                        }
                        break;
                    case '127.0.*':
                        assert.equal(1, n);
                        assert.equal('root', users[0].name);
                        break;
                    case '1*7.*':
                        assert.equal(1, n);
                        assert.equal('root', users[0].name);
                        break;
                    case '1*7.0.0.*':
                        assert.equal(1, n);
                        assert.equal('root', users[0].name);
                        break;
                    default:
                        throw new Error(`host '${host}'?`);
                }
            }
        });
    });
}

module.exports = run;
