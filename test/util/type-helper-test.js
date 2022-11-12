const TypeHelper = require('../../util/type-helper');
const runIf = require('../run-if');

const test = require('test');
const ArgumentError = require('../../lang/argument-error');

runIf(__filename, run);

function run() {
    test.setup();

    const Cat = require('./cat');

    describe('TypeHelper', () => {
        it('ensureInstanceof()', () => {
            TypeHelper.ensureInstanceof(new Number(0), Number);
            TypeHelper.ensureInstanceof(new Number(0.1), Number);
            TypeHelper.ensureInstanceof(new Number(1e1), Number);
            TypeHelper.ensureInstanceof(new Number(0), Object);

            TypeHelper.ensureInstanceof(new Boolean(true), Boolean);
            TypeHelper.ensureInstanceof(new Boolean(false), Boolean);
            TypeHelper.ensureInstanceof(new Boolean(false), Object);

            TypeHelper.ensureInstanceof(new String('ab'), String);
            TypeHelper.ensureInstanceof(new String('ab'), Object);
            
            TypeHelper.ensureInstanceof(new Date(), Date);
            TypeHelper.ensureInstanceof(new Date(), Object);

            TypeHelper.ensureInstanceof({}, Object);
            TypeHelper.ensureInstanceof([], Array);
            TypeHelper.ensureInstanceof([], Object);

            TypeHelper.ensureInstanceof(new Map(), Map);
            TypeHelper.ensureInstanceof(new Map(), Object);
            TypeHelper.ensureInstanceof(new Set(), Set);
            TypeHelper.ensureInstanceof(new Set(), Object);

            TypeHelper.ensureInstanceof(() => {}, Function);
            TypeHelper.ensureInstanceof(() => {}, Object);
            TypeHelper.ensureInstanceof(function(){}, Function);
            TypeHelper.ensureInstanceof(function(){}, Object);
            TypeHelper.ensureInstanceof(Function, Object);
            TypeHelper.ensureInstanceof(Object, Function);

            try {
                TypeHelper.ensureInstanceof(null, Object);
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof TypeError);
            }

            try {
                TypeHelper.ensureInstanceof({}, Number);
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof TypeError);
            }

            try {
                TypeHelper.ensureInstanceof(undefined, Object);
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof TypeError);
            }

            try {
                TypeHelper.ensureInstanceof(1, undefined);
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof ArgumentError);
            }

            try {
                TypeHelper.ensureInstanceof(1, String);
                throw new Error();
            } catch (e) {
                assert.ok(e instanceof TypeError);
            }
        });

        it ('ensureInteger()', () => {
            TypeHelper.ensureInteger(0);
            TypeHelper.ensureInteger(1);
            TypeHelper.ensureInteger(-1);
            TypeHelper.ensureInteger(1.0);
            TypeHelper.ensureInteger(1.);
            TypeHelper.ensureInteger(1n);
            TypeHelper.ensureInteger(1234567890123456n);
            TypeHelper.ensureInteger(new Number(1));
            TypeHelper.ensureInteger(new Number(1.));
            TypeHelper.ensureInteger(new Number(1.0));
            TypeHelper.ensureInteger(9007199254740991);
            TypeHelper.ensureInteger(9007199254740991n);
            
            let fails = [1.1, 12345678901234567890123n, '0', '0.0', ' 0', ' 0 ',
                '010', '0x10b', undefined, null, true, false, new Boolean(true),
                new Object(), Object, Function, [], {}, () => {}, function() {},
                9007199254740992, -9007199254740992
            ];
            fails.forEach(item => {
                try {
                    TypeHelper.ensureInteger(item);
                    throw new Error(item);
                } catch (e) {
                    assert.ok(e instanceof TypeError, e.stack);
                }
            });
        });

        it('ensureString', () => {
            let oks = ['', ' ', '\t', 'a', "ab", new String("ab"), new String(1),
                new String(1), new String(true), new String(false), new String(1n),
                new String(1.1), new String([]), new String({}), new String(()=>{}),
                new String(undefined)
            ];
            oks.forEach(str => TypeHelper.ensureString(str));
            oks.forEach(str => TypeHelper.ensureString(str, 'str'));

            let fails = [undefined, null, true, false, 0, 1, 0.1, 1., 1n, 0x10, 
                new Date(), new Boolean(), new Number(1), new Function(), new Object(),
                [], {}, ()=>{}, function() {}, Array, Object, Function
            ];
            fails.forEach(str => {
                try {
                    TypeHelper.ensureString(str);
                } catch (e) {
                    assert.ok(e instanceof TypeError, e.stack);
                }
            });
            fails.forEach(str => {
                try {
                    TypeHelper.ensureString(str, 'str');
                } catch (e) {
                    assert.ok(e instanceof TypeError, e.stack);
                }
            });
        });

        it('ensureBoolean', () => {
            let oks = [true, false, new Boolean(true), new Boolean(false),
                new Boolean(undefined), new Boolean(null), new Boolean(0)
            ];
            oks.forEach(str => TypeHelper.ensureBoolean(str));
            oks.forEach(str => TypeHelper.ensureBoolean(str, 'str'));

            let fails = [undefined, null, 'true', 'false', 0, 1, 0.1, 1., 1n, 0x10, 
                new Date(), Boolean, new Number(1), new Function(), new Object(),
                [], {}, ()=>{}, function() {}, Array, Object, Function
            ];
            fails.forEach(b => {
                try {
                    TypeHelper.ensureBoolean(b);
                } catch (e) {
                    assert.ok(e instanceof TypeError, e.stack);
                }
            });
            fails.forEach(b => {
                try {
                    TypeHelper.ensureBoolean(b, 'b');
                } catch (e) {
                    assert.ok(e instanceof TypeError, e.stack);
                }
            });
        });

        it('parseDecimal()', () => {
            let oks = [0, 0., 0.0, 0.00, .0, .00, 1, +1, -1, 1.0, 1n, 1e1];
            oks.forEach(item => {
                let n = TypeHelper.parseDecimal(item);
                assert.equal(item, n);
                n = TypeHelper.parseDecimal(item, true);
                assert.equal(item, n);
            });
            
            oks = ['0', '0.', '0.0', '0.00', 
                '+0', '+0.', '+0.0', '+0.00',
                ' +0', ' +0 ', ' +0. ', ' +0.0 ', ' +0.00 ',
                '-0', '-0.', '-0.0', '-0.00',
                ' -0', ' -0.', ' -0.0', ' -0.00',
                ' -0 ', ' -0. ', ' -0.0', ' -0.00'
            ];
            oks.forEach(item => {
                let n = TypeHelper.parseDecimal(item);
                assert.equal(0, n);
                n = TypeHelper.parseDecimal(item, true);
                assert.equal(0, n);
            });

            oks = ['0', '0.', '0.0', '0.00', '.0', '.00', 
                '+0', '+0.', '+0.0', '+0.00', '+.0', '+.00', 
                ' +0', ' +0 ', ' +0. ', ' +0.0 ', ' +0.00 ', ' +.0 ', ' +.00 ',
                '-0', '-0.', '-0.0', '-0.00', '-.0', '-.00', 
                ' -0', ' -0.', ' -0.0', ' -0.00', ' -.0', ' -.00', 
                ' -0 ', ' -0. ', ' -0.0', ' -0.00', ' -.0', ' -.00', ' -.00 ',
            ];
            oks.forEach(item => {
                let n = TypeHelper.parseDecimal(item);
                assert.equal(0, n);
            });

            n = TypeHelper.parseDecimal('1');
            assert.equal(1, n);
            n = TypeHelper.parseDecimal('-1');
            assert.equal(-1, n);
            n = TypeHelper.parseDecimal('1 ');
            assert.equal(1, n);
            n = TypeHelper.parseDecimal(' 1');
            assert.equal(1, n);
            n = TypeHelper.parseDecimal(' 1 ');
            assert.equal(1, n);
            n = TypeHelper.parseDecimal('\t1 ');
            assert.equal(1, n);
            n = TypeHelper.parseDecimal('1\t');
            assert.equal(1, n);
            n = TypeHelper.parseDecimal(new Number(1));
            assert.equal(1, n);
            n = TypeHelper.parseDecimal(new Number(1.0));
            assert.equal(1, n);
            n = TypeHelper.parseDecimal(new Number(1.));
            assert.equal(1, n);
            n = TypeHelper.parseDecimal(BigInt(1));
            assert.equal(1, n);
            n = TypeHelper.parseDecimal(new String('1'));
            assert.equal(1, n);

            n = TypeHelper.parseDecimal(9007199254740991);
            assert.equal(Number.MAX_SAFE_INTEGER, n);
            n = TypeHelper.parseDecimal('9007199254740991');
            assert.equal(Number.MAX_SAFE_INTEGER, n);

            let fails = [' 0', ' 0', ' 0 ', ' 1 ', '\t1', '1\t', ' 1\t'];
            fails.forEach(item => {
                try {
                    TypeHelper.parseDecimal(item, true, 'item', false);
                    throw new Error(item);
                } catch (e) {
                    assert.ok(e instanceof ArgumentError, e.stack);
                }
            });

            fails = ['00', '001', '0.01', '0.1', '.01', '1.1', 9007199254740992,
                '1.01', '1.001', '1.1', '1n', '1N', '1e1', '9007199254740992',
                undefined, null, true, '', [], {}, ()=>{}, function(){}, 
                new Date(), new Object(), new Number(1.1), new String('1.01'),
                new String('0x1n'), new String('1.001'), new String('1.1'),
                new String('01.'), new String('0x1.'), new String('0X1.')
            ];
            fails.forEach(item => {
                try {
                    let n = TypeHelper.parseDecimal(item, true, 'item');
                    throw new Error(n + ' <-> ' + item);
                } catch (e) {
                    assert.ok(e instanceof ArgumentError, e.stack);
                }
            });
        });
    });

    test.run();
}

module.exports = run;
