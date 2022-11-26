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
    });
}

module.exports = run;
