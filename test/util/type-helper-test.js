const TypeHelper = require('../../util/type-helper');
const runIf = require('../run-if');

const test = require('test');
const ArgumentError = require('../../lang/argument-error');

runIf(__filename, run);

function run() {
    test.setup();

    const Cat = require('./cat');

    describe('TypeHelper', () => {
        it('ensureOf()', () => {
            TypeHelper.ensureOf(0, Number);
            TypeHelper.ensureOf(0.1, Number);
            TypeHelper.ensureOf(new Number(1), Number);
            TypeHelper.ensureOf(0, Object);

            TypeHelper.ensureOf(true, Boolean);
            TypeHelper.ensureOf(new Boolean(false), Boolean);

            TypeHelper.ensureOf('a', String);
            TypeHelper.ensureOf('ab', String);
            TypeHelper.ensureOf(new String('ab'), String);
            
            TypeHelper.ensureOf(new Date(), Date);

            TypeHelper.ensureOf(null, Object);
            TypeHelper.ensureOf({}, Object);
            TypeHelper.ensureOf([], Array);
            TypeHelper.ensureOf([], Object);

            TypeHelper.ensureOf(new Map(), Map);
            TypeHelper.ensureOf(new Map(), Object);
            TypeHelper.ensureOf(new Set(), Set);
            TypeHelper.ensureOf(new Set(), Object);

            TypeHelper.ensureOf(() => {}, Function);
            TypeHelper.ensureOf(function(){}, Function);
            TypeHelper.ensureOf(Function, Object);
            TypeHelper.ensureOf(Object, Function);

            try {
                TypeHelper.ensureOf({}, Number);
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof TypeError);
            }

            try {
                TypeHelper.ensureOf(undefined, Object);
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof ArgumentError);
            }

            try {
                TypeHelper.ensureOf(1, undefined);
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof ArgumentError);
            }

            try {
                TypeHelper.ensureOf(1, String);
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof TypeError);
            }
        });

        it ('ensureInt()', () => {
            let n = TypeHelper.ensureInt(0);
            assert.equal(0, n);

            n = TypeHelper.ensureInt(1);
            assert.equal(1, n);
            n = TypeHelper.ensureInt(-1);
            assert.equal(-1, n);

            n = TypeHelper.ensureInt('0');
            assert.equal(0, n);
            try {
                TypeHelper.ensureInt('0.0');
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof TypeError);
            }
            try {
                TypeHelper.ensureInt(' 0');
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof TypeError);
            }
            try {
                TypeHelper.ensureInt('0 ');
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof TypeError);
            }

            n = TypeHelper.ensureInt('10');
            assert.equal(10, n);
            try {
                TypeHelper.ensureInt('a10');
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof TypeError);
            }
            try {
                TypeHelper.ensureInt('10b');
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof TypeError);
            }

            n = TypeHelper.ensureInt('010');
            assert.equal(10, n);
            n = TypeHelper.ensureInt('0x10');
            assert.equal(16, n);
            n = TypeHelper.ensureInt('0X20');
            assert.equal(32, n);
            n = TypeHelper.ensureInt('0X1f');
            assert.equal(31, n);
            n = TypeHelper.ensureInt('0X1F');
            assert.equal(31, n);
        });
    });

    test.run();
}

module.exports = run;
