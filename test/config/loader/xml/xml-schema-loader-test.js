const DataHostConfig = require('../../../../config/model/data-host-config');
const runIf = require('../../../run-if');
const XmlSchemaLoader = require('../../../../config/loader/xml/xml-schema-loader');
const DBHostConfig = require('../../../../config/model/db-host-config');
const DataNodeConfig = require('../../../../config/model/data-node-config');

const path = require('path');
const test = require('test');

runIf(__filename, run);

function run() {
    test.setup();

    describe('XmlSchemaLoader', () => {
        let loader = null;

        it('load()', () => {
            let schemaFile = path.join(__dirname, 'schema.xml');
            loader = new XmlSchemaLoader(schemaFile);
        });

        it('test dataHost', () => {
            const dataHosts = loader.dataHosts;
            assert.ok(dataHosts instanceof Map);
            for (let [key, value] of dataHosts) {
                assert.ok(value instanceof DataHostConfig);
                const host = value;
                switch (key) {
                    case 'localhost1':
                        assert.equal(key, host.name);
                        assert.equal(1000, host.maxCon);
                        assert.equal(10, host.minCon);
                        assert.equal(0, host.balance);
                        assert.equal(0, host.writeType);
                        assert.equal('mysql', host.dbType);
                        assert.equal('native', host.dbDriver);
                        assert.equal(1, host.switchType);
                        assert.equal(100, host.slaveThreshold);
                        assert.equal('select user()', host.heartbeatSQL);
                        assert.equal('', host.connectionInitSql);
                        assert.equal('mergeStat', host.filters);
                        assert.equal('', host.slaveIDs);
                        assert.equal('0', host.notSwitch);
                        assert.equal(300000, host.logTime);
                        assert.equal(3, host.maxRetryCount);
                        assert.equal(false, host.tempReadHostAvailable);
                        assert.equal(false, host.isShowSlaveSql);
                        assert.equal(false, host.isShowClusterSql);
                        break;
                    case 'sequoiadb1':
                        assert.equal(key, host.name);
                        assert.equal(1000, host.maxCon);
                        assert.equal(1, host.minCon);
                        assert.equal(0, host.balance);
                        assert.equal(0, host.writeType);
                        assert.equal('sequoiadb', host.dbType);
                        assert.equal('jdbc', host.dbDriver);
                        assert.equal(1, host.switchType);
                        assert.equal(-1, host.slaveThreshold);
                        assert.equal('', host.heartbeatSQL);
                        assert.equal('', host.connectionInitSql);
                        assert.equal('mergeStat', host.filters);
                        assert.equal('', host.slaveIDs);
                        assert.equal('0', host.notSwitch);
                        assert.equal(300000, host.logTime);
                        assert.equal(3, host.maxRetryCount);
                        assert.equal(false, host.tempReadHostAvailable);
                        assert.equal(false, host.isShowSlaveSql);
                        assert.equal(false, host.isShowClusterSql);
                        break;
                    default:
                        throw new Error(`Unknown dataHost '${key}'`);
                }
            }
        });

        it ('test writeHost', () => {
            const dataHosts = loader.dataHosts;
            for (let [key, value] of dataHosts) {
                const host = value;
                let writeHosts;
                let n;
                switch (key) {
                    case 'localhost1':
                        writeHosts = host.writeHosts;
                        assert.ok(writeHosts instanceof Array);
                        n = writeHosts.length;
                        assert.equal(2, n);
                        for (let i = 0; i < n; ++i) {
                            let wHost = writeHosts[i];
                            assert.ok(wHost instanceof DBHostConfig);
                            switch(i) {
                                case 0:
                                    assert.equal('hostM1', wHost.hostName);
                                    assert.equal('localhost:3306', wHost.url);
                                    assert.equal('localhost', wHost.ip);
                                    assert.equal(3306, wHost.port);
                                    assert.equal('root', wHost.user);
                                    assert.equal('root', wHost.password);
                                    assert.equal('root', wHost.encryptPassword);
                                    assert.equal('mysql', wHost.dbType);
                                    assert.equal(1000, wHost.maxCon);
                                    assert.equal(10, wHost.minCon);
                                    assert.equal(true, wHost.checkAlive);
                                    assert.equal('mergeStat', wHost.filters);
                                    assert.equal(300000, wHost.logTime);
                                    assert.equal(0, wHost.weight);
                                    break;
                                case 1:
                                    assert.equal('hostM2', wHost.hostName);
                                    assert.equal('localhost:3326', wHost.url);
                                    assert.equal('localhost', wHost.ip);
                                    assert.equal(3326, wHost.port);
                                    assert.equal('root', wHost.user);
                                    assert.equal('123456', wHost.password);
                                    assert.equal('123456', wHost.encryptPassword);
                                    assert.equal('mysql', wHost.dbType);
                                    assert.equal(1000, wHost.maxCon);
                                    assert.equal(10, wHost.minCon);
                                    assert.equal(true, wHost.checkAlive);
                                    assert.equal('mergeStat', wHost.filters);
                                    assert.equal(300000, wHost.logTime);
                                    assert.equal(0, wHost.weight);
                                    break;
                                default:
                                    throw new Error('db host more than 2!');
                            }
                        }
                        break;
                    case 'sequoiadb1':
                        writeHosts = host.writeHosts;
                        assert.ok(writeHosts instanceof Array);
                        n = writeHosts.length;
                        assert.equal(1, n);
                        for (let i = 0; i < n; ++i) {
                            let wHost = writeHosts[i];
                            assert.ok(wHost instanceof DBHostConfig);
                            switch(i) {
                                case 0:
                                    assert.equal('hostM1', wHost.hostName);
                                    assert.equal('sequoiadb://1426587161.dbaas.sequoialab.net:11920/SAMPLE', wHost.url);
                                    assert.equal('1426587161.dbaas.sequoialab.net', wHost.ip);
                                    assert.equal(11920, wHost.port);
                                    assert.equal('jifeng', wHost.user);
                                    assert.equal('jifeng', wHost.password);
                                    assert.equal('jifeng', wHost.encryptPassword);
                                    assert.equal('sequoiadb', wHost.dbType);
                                    assert.equal(1000, wHost.maxCon);
                                    assert.equal(1, wHost.minCon);
                                    assert.equal(true, wHost.checkAlive);
                                    assert.equal('mergeStat', wHost.filters);
                                    assert.equal(300000, wHost.logTime);
                                    assert.equal(0, wHost.weight);
                                    break;
                                default:
                                    throw new Error('db host more than 1!');
                            }
                        }
                        break;
                    default:
                        throw new Error(`Unknown dataHost '${key}'`);
                }
            }
        });

        it ('test readHost', () => {
            const dataHosts = loader.dataHosts;
            for (let [key, value] of dataHosts) {
                const host = value;
                let writeHosts, readHosts;
                let n, m;
                switch (key) {
                    case 'localhost1':
                        writeHosts = host.writeHosts;
                        n = writeHosts.length;
                        readHosts = host.readHosts;
                        assert.ok(readHosts instanceof Map);
                        m = readHosts.size;
                        assert.equal(1, m);
                        for (let i = 0; i < n; ++i) {
                            let rHosts, rHost;
                            switch(i) {
                                case 0:
                                    rHosts = readHosts.get(i);
                                    assert.ok(rHosts instanceof Array);
                                    assert.equal(1, rHosts.length);
                                    rHost = rHosts[0];
                                    assert.equal('hostS1', rHost.hostName);
                                    assert.equal('localhost:3316', rHost.url);
                                    assert.equal('localhost', rHost.ip);
                                    assert.equal(3316, rHost.port);
                                    assert.equal('root', rHost.user);
                                    assert.equal('123456', rHost.password);
                                    assert.equal('123456', rHost.encryptPassword);
                                    assert.equal('mysql', rHost.dbType);
                                    assert.equal(1000, rHost.maxCon);
                                    assert.equal(10, rHost.minCon);
                                    assert.equal(true, rHost.checkAlive);
                                    assert.equal('mergeStat', rHost.filters);
                                    assert.equal(300000, rHost.logTime);
                                    assert.equal(0, rHost.weight);
                                    break;
                                case 1:
                                    rHosts = readHosts.get(i);
                                    assert.equal(null, rHosts);
                                    break;
                                default:
                                    throw new Error('db host more than 2!');
                            }
                        }
                        break;
                    case 'sequoiadb1':
                        writeHosts = host.writeHosts;
                        n = writeHosts.length;
                        readHosts = host.readHosts;
                        assert.ok(readHosts instanceof Map);
                        m = readHosts.size;
                        assert.equal(0, m);
                        for (let i = 0; i < n; ++i) {
                            switch(i) {
                                case 0:
                                    rHosts = readHosts.get(i);
                                    assert.equal(null, rHosts);
                                    break;
                                default:
                                    throw new Error('db host more than 1!');
                            }
                        }
                        break;
                    default:
                        throw new Error(`Unknown dataHost '${key}'`);
                }
            }
        });

        it ('test dataNode', () => {
            let dataNodes = loader.dataNodes;
            assert.ok(dataNodes instanceof Map);
            let n = dataNodes.size;
            assert.equal(7, n);

            for (let [key, value] of dataNodes) {
                assert.ok(value instanceof DataNodeConfig);
                let dataNode = value;
                switch(key) {
                    case 'dn10':
                        assert.equal(key, dataNode.name);
                        assert.equal('db0', dataNode.database);
                        assert.equal('localhost1', dataNode.dataHost);
                        break;
                     case 'dn11':
                        assert.equal(key, dataNode.name);
                        assert.equal('db1', dataNode.database);
                        assert.equal('localhost1', dataNode.dataHost);
                        break;
                    case 'dn12':
                        assert.equal(key, dataNode.name);
                        assert.equal('db2', dataNode.database);
                        assert.equal('localhost1', dataNode.dataHost);
                        break;
                    case 'dn20':
                        assert.equal(key, dataNode.name);
                        assert.equal('db20', dataNode.database);
                        assert.equal('sequoiadb1', dataNode.dataHost);
                        break;
                    case 'dn1':
                        assert.equal(key, dataNode.name);
                        assert.equal('db1', dataNode.database);
                        assert.equal('localhost1', dataNode.dataHost);
                        break;
                    case 'dn2':
                        assert.equal(key, dataNode.name);
                        assert.equal('db2', dataNode.database);
                        assert.equal('localhost1', dataNode.dataHost);
                        break;
                    case 'dn3':
                        assert.equal(key, dataNode.name);
                        assert.equal('db3', dataNode.database);
                        assert.equal('localhost1', dataNode.dataHost);
                        break;
                    default:
                        throw new Error(`Unknown dataNode '${key}'!`);     
                }
            }
        });

        it('load a schema.xml that doesn\'t exist', () => {
            let schemaFile = path.join(__dirname, 'schema-not-found.xml');
            try {
                new XmlSchemaLoader(schemaFile);
                throw new Error(`'${schemaFile}' existing??`);
            } catch (e) {
                if (e.code) assert.equal('ENOENT', e.code);
                else if (e.number) assert.equal(2, e.number);
                else throw e;
            }
        });

        it('load a malformed schema.xml', () => {
            let schemaFile = path.join(__dirname, 'schema-malformed.xml');
            try {
                new XmlSchemaLoader(schemaFile);
                throw new Error(`'${schemaFile}' format correct??`);
            } catch (e) {
                assert.equal('XmlParser: error on line 59 at column 2: unclosed token',
                    e.message);
            }
        });
    });

    test.run();
}

module.exports = run;
