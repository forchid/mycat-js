const DataHostConfig = require('../../../../config/model/data-host-config');
const runIf = require('../../../run-if');
const XmlSchemaLoader = require('../../../../config/loader/xml/xml-schema-loader');

const path = require('path');
const test = require('test');

runIf(__filename, run);

function run() {
    test.setup();

    describe('XmlSchemaLoader', () => {
        let schemaFile = path.join(__dirname, 'schema.xml');
        const loader = new XmlSchemaLoader(schemaFile);

        it('load dataHost', () => {
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
                        assert.equal('jdbc', host.dbDriver);
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
    });

    test.run();
}

module.exports = run;
