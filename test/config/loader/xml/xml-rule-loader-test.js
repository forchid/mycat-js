const PartitionByCRC32PreSlot = require('../../../../route/function/partition-by-crc32-pre-slot');
const PartitionByMod = require('../../../../route/function/partition-by-mod');
const PartitionByMurmurHash = require('../../../../route/function/partition-by-murmur-hash');
const RuleConfig = require('../../../../config/model/rule/rule-config');
const runIf = require('../../../run-if');
const TableRuleConfig = require('../../../../config/model/table-rule-config');
const XMLRuleLoader = require('../../../../config/loader/xml/xml-rule-loader');

const path = require('path');

runIf(__filename, run);

function run() {
    describe('XmlRuleLoader', () => {
        it('load()', () => {
            let ruleFile = path.join(__dirname, 'rule.xml');
            let loader = new XMLRuleLoader(ruleFile);
            let tableRules = loader.tableRules;

            assert.equal(3, tableRules.size);
            for (let [key, value] of tableRules) {
                assert.ok(value instanceof TableRuleConfig);
                assert.ok(key, value.name);
                let rule = value.rule;
                assert.ok(rule instanceof RuleConfig);
                let algo = rule.algorithm;
                switch(key) {
                    case 'mod-long':
                        assert.equal('ID', rule.column);
                        assert.equal('mod-long', rule.functionName);
                        assert.ok(algo instanceof PartitionByMod);
                        assert.equal(3, algo.count);
                        break;
                    case 'sharding-by-murmur':
                        assert.equal('ID', rule.column);
                        assert.equal('murmur', rule.functionName);
                        assert.ok(algo instanceof PartitionByMurmurHash);
                        assert.equal(0, algo.seed);
                        assert.equal(2, algo.count);
                        assert.equal(160, algo.virtualBucketTimes);
                        break;
                    case 'crc32slot':
                        assert.equal('ID', rule.column);
                        assert.equal('crc32slot', rule.functionName);
                        assert.ok(algo instanceof PartitionByCRC32PreSlot);
                        break;
                    default:
                        throw new Error(`Unknown tableRule '${key}'`);
                }
            }
        });
    });
}

module.exports = run;
