const Scheduler = require('../../util/scheduler');
const runIf = require('../run-if');
const co = require('coroutine');

runIf(__filename, run);

function run() {

    describe('Serial scheduler', () => {
        let scheduler = new Scheduler();
        let sem = new co.Semaphore(1);

        it ('init', () => {
            assert.equal(false, scheduler.closed);
            assert.equal(false, scheduler.concur);
            assert.equal(0, scheduler.timerCount);
        });

        it ('schedule', () => {
            let n = 0, m = 10;
            sem.acquire();
            scheduler.schedule('a', () => {
                if (++n === m) {
                    scheduler.cancel('a');
                    sem.release();
                }
            }, 0, 1);
            console.log('schedule no args timer OK');
            sem.acquire();
            assert.equal(m, n);
            assert.equal(false, scheduler.closed);
            assert.equal(0, scheduler.timerCount);
            
            m = 30;
            scheduler.schedule('a', (i) => {
                assert.equal(2, i);
                n += i;
                if (n === m) {
                    scheduler.cancel('a');
                    sem.release();
                }
            }, 10, 10, [2]);
            console.log('schedule args timer OK');
            sem.acquire();
            try {
                assert.equal(m, n);
                assert.equal(false, scheduler.closed);
                assert.equal(0, scheduler.timerCount);
            } finally {
                sem.release();
            }
        });

        it ('delay', () => {
            let a = false;
            sem.acquire();
            scheduler.delay('a', () => {
                a = true;
                sem.release();
            }, 0);
            assert.equal(false, scheduler.closed);
            assert.equal(1, scheduler.timerCount);
            sem.acquire();
            assert.ok(true === a);
            assert.equal(false, scheduler.closed);
            assert.equal(0, scheduler.timerCount);

            scheduler.delay('a', (b) => {
                a = b;
                sem.release();
            }, 10, [false]);
            assert.equal(false, scheduler.closed);
            assert.equal(1, scheduler.timerCount);
            sem.acquire();
            assert.ok(false === a);
            assert.equal(false, scheduler.closed);
            assert.equal(0, scheduler.timerCount);
            sem.release();
        });

        it ('shutdown', () => {
            scheduler.shutdown();
            assert.equal(true, scheduler.closed);
            assert.equal(false, scheduler.concur);
            assert.equal(0, scheduler.timerCount);
            let failed = false;
            try {
                scheduler.delay('a', ()=> {}, 0);
                failed = true;
                throw new Error(`Scheduler state error!`);
            } catch (e) {
                if (failed) throw e;
                // OK
            }
        });
    });

    describe('Concur scheduler', () => {
        let scheduler = new Scheduler(true);
        let sem = new co.Semaphore(1);

        it ('init', () => {
            assert.equal(false, scheduler.closed);
            assert.equal(true, scheduler.concur);
            assert.equal(0, scheduler.timerCount);
        });

        it ('schedule', () => {
            let n = 0, m = 10, itr = n;
            sem.acquire();
            scheduler.schedule('a', () => {
                ++itr;
                co.sleep(1);
                if (n === m) {
                    scheduler.cancel('a');
                    sem.release();
                } else if (n < m) {
                    ++n;
                }
            }, 0, 1);
            console.log('schedule no args timer OK');
            sem.acquire();
            assert.ok(itr > n);
            assert.equal(m, n);
            assert.equal(false, scheduler.closed);
            assert.equal(0, scheduler.timerCount);
            
            m = 30;
            itr = n;
            scheduler.schedule('a', (i) => {
                assert.equal(2, i);
                itr += i;
                co.sleep(10);
                if (n === m) {
                    scheduler.cancel('a');
                    sem.release();
                } else if (n < m) {
                    n += i;
                }
            }, 10, 10, [2]);
            console.log('schedule args timer OK');
            sem.acquire();
            try {
                assert.ok(itr > n);
                assert.equal(m, n);
                assert.equal(false, scheduler.closed);
                assert.equal(0, scheduler.timerCount);
            } finally {
                sem.release();
            }
        });

        it ('shutdown', () => {
            scheduler.shutdown();
            assert.equal(true, scheduler.closed);
            assert.equal(true, scheduler.concur);
            assert.equal(0, scheduler.timerCount);
            let failed = false;
            try {
                scheduler.delay('a', ()=> {}, 0);
                failed = true;
                throw new Error(`Scheduler state error!`);
            } catch (e) {
                if (failed) throw e;
                // OK
            }
        });
    });

}

module.exports = run;
