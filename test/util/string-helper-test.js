const StringHelper = require('../../util/string-helper');
const ArgumentError = require('../../lang/argument-error');
const runIf = require('../run-if');

const test = require('test');

runIf(__filename, run);

function run() {
    test.setup();

    describe('StringHelper', () => {
        it('ensureNotBlank()', () => {
            StringHelper.ensureNotBlank('a');
            StringHelper.ensureNotBlank('a ');
            StringHelper.ensureNotBlank(' a');
            StringHelper.ensureNotBlank(' a ');
            StringHelper.ensureNotBlank('ab ');

            try {
                StringHelper.ensureNotBlank('');
                assert.fail();
            } catch (e) {
                if (!e instanceof ArgumentError) {
                    assert.fail();
                }
            }

            try {
                StringHelper.ensureNotBlank(' ');
                assert.fail();
            } catch (e) {
                if (!e instanceof ArgumentError) {
                    assert.fail();
                }
            }

            try {
                StringHelper.ensureNotBlank('   ');
                assert.fail();
            } catch (e) {
                if (!e instanceof ArgumentError) {
                    assert.fail();
                }
            }

            try {
                StringHelper.ensureNotBlank('\t');
                assert.fail();
            } catch (e) {
                if (!e instanceof ArgumentError) {
                    assert.fail();
                }
            }

            try {
                StringHelper.ensureNotBlank(null);
                assert.fail();
            } catch (e) {
                if (!e instanceof TypeError) {
                    assert.fail();
                }
            }

            try {
                StringHelper.ensureNotBlank(0);
                assert.fail();
            } catch (e) {
                if (!e instanceof TypeError) {
                    assert.fail();
                }
            }

            try {
                StringHelper.ensureNotBlank({});
                assert.fail();
            } catch (e) {
                if (!e instanceof TypeError) {
                    assert.fail();
                }
            }
        }); // ensureNotBlank()

        it('mapJavaClassName()', () => {
            let res = StringHelper.mapJavaClassName('T');
            assert.equal('t', res);

            res = StringHelper.mapJavaClassName('t');
            assert.equal('t', res);

            res = StringHelper.mapJavaClassName('Test');
            assert.equal('test', res);

            res = StringHelper.mapJavaClassName('Test1');
            assert.equal('test1', res);

            res = StringHelper.mapJavaClassName('TestCRC32');
            assert.equal('test-crc32', res);

            res = StringHelper.mapJavaClassName('TestCRC32');
            assert.equal('test-crc32', res);

            res = StringHelper.mapJavaClassName('io.mycat.route.function.PartitionByMurmurHash');
            assert.equal('io/mycat/route/function/partition-by-murmur-hash', res);

            res = StringHelper.mapJavaClassName('io.mycat.route.function.PartitionByCRC32PreSlot');
            assert.equal('io/mycat/route/function/partition-by-crc32-pre-slot', res);

            try {
                StringHelper.mapJavaClassName(null);
                assert.fail();
            } catch (e) {
                if (!e instanceof TypeError) {
                    assert.fail();
                }
            }
        }); // mapJavaClassName()
    });

    test.run();
}

module.exports = run;
