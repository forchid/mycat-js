const Handler = require('../../handler');
const runIf = require('../run-if');

runIf(__filename, run);

function run() {

    function inc(a) {
        return ++a;
    }

    function mul(a) {
        return a * a;
    }

    describe ('Handler', () => {
        it ('Function handler', () => {
            let h = new Handler(inc);
            let v = h.invoke(10);
            assert.equal(11, v);
            
            h = h.handler();
            assert.ok(h instanceof Handler);
            v = h.invoke(100);
            assert.equal(101, v);
        });

        it ('Function chain', () => {
            let h = new Handler([inc, mul]);
            let v = h.invoke(10);
            assert.equal(121, v);

            h = h.handler(1);
            v = h.invoke(100);
            assert.equal(10000, v);

            h = new Handler({ inc, mul });
            v = h.invoke(11);
            assert.equal(144, v);

            h = h.handler('mul');
            v = h.invoke(100);
            assert.equal(10000, v);
        });

        it ('Routing', () => {
            class Op extends Handler {
                constructor (handlers) {
                    super(handlers);
                }

                invoke(m) {
                    let h;
                    switch (m.op) {
                        case '+':
                            h = this.handler('inc');
                            break;
                        case '*':
                            h = this.handler('mul');
                            break;
                        default:
                            throw new Error(`Unknown op ${m.op}!`);
                    }
                    return h.invoke(m.val);
                }
            }
            let h = new Op({ inc, mul});
            let v = h.invoke({ op: '+', val: 10 });
            assert.equal(11, v);
            v = h.invoke({ op: '*', val: 10 });
            assert.equal(100, v);
        });

        it ('remove()', () => {
            let h = new Handler(inc);
            let ok = h.remove(inc);
            assert.ok(ok);
            let res = h.invoke(1);
            assert.equal(undefined, res);

            ok = h.remove(inc);
            assert.ok(!ok);
            res = h.invoke(1);
            assert.equal(undefined, res);

            h = new Handler([inc, mul]);
            ok = h.remove(mul);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(2, res);
            ok = h.remove(mul);
            assert.ok(!ok);
            res = h.invoke(1);
            assert.equal(2, res);

            ok = h.remove(inc);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(undefined, res);
            ok = h.remove(inc);
            assert.ok(!ok);
            res = h.invoke(1);
            assert.equal(undefined, res);

            h = new Handler({ inc, mul});
            ok = h.remove(mul);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(2, res);

            ok = h.remove(mul);
            assert.ok(!ok);
            res = h.invoke(1);
            assert.equal(2, res);

            ok = h.remove(inc);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(undefined, res);
            ok = h.remove(inc);
            assert.ok(!ok);
            res = h.invoke(1);
            assert.equal(undefined, res);
        });

        it ('add()', () => {
            let h = new Handler([inc]);
            let ok = h.add(mul);
            assert.ok(ok);
            let res = h.invoke(1);
            assert.equal(4, res);

            ok = h.remove(inc);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(1, res);

            ok = h.add(1, inc);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(2, res);

            ok = h.remove(mul);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(2, res);

            ok = h.add(0, inc);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(3, res);

            h = new Handler({ inc });
            ok = h.add('inc', inc);
            assert.ok(!ok);
            res = h.invoke(1);
            assert.equal(2, res);

            ok = h.add(inc);
            assert.ok(!ok);
            res = h.invoke(1);
            assert.equal(2, res);

            ok = h.add('mul', mul);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(4, res);

            ok = h.add('mul', mul);
            assert.ok(!ok);
            res = h.invoke(1);
            assert.equal(4, res);

            ok = h.remove(mul);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(2, res);

            ok = h.add('mul', mul);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(4, res);
        });

        it ('append()', () => {
            let h = new Handler([inc]);
            let ok = h.append(mul);
            assert.ok(ok);
            let res = h.invoke(1);
            assert.equal(4, res);

            ok = h.remove(inc);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(1, res);

            ok = h.append(inc);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(2, res);
        });

        it ('prepend()', () => {
            let h = new Handler([inc]);
            let ok = h.prepend(mul);
            assert.ok(ok);
            let res = h.invoke(1);
            assert.equal(2, res);

            ok = h.remove(inc);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(1, res);

            ok = h.prepend(inc);
            assert.ok(ok);
            res = h.invoke(1);
            assert.equal(4, res);
        });
    });
}

module.exports = run;
