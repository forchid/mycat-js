const Scheduler = require('../../util/scheduler');
const runIf = require('../run-if');
const co = require('coroutine');

runIf(__filename, run);

function run() {

    describe('Serial scheduler', () => {
        let scheduler = new Scheduler();
        let sem = new co.Semaphore();

        it ('init', () => {
            assert.equal(false, scheduler.closed);
            assert.equal(false, scheduler.concur);
            assert.equal(0, scheduler.taskCount);
        });

        it ('schedule', () => {
            let n = 0, m = 2, itr = n;
            sem.acquire();
            scheduler.schedule('a', () => {
                ++itr;
                co.sleep(1);
                if (++n === m) {
                    scheduler.cancel('a');
                    sem.release();
                }
            }, 0, 1);
            console.log('schedule no args timer OK');
            sem.acquire();
            assert.equal(itr, n);
            assert.equal(m, n);
            assert.equal(false, scheduler.closed);
            assert.equal(0, scheduler.taskCount);
            
            m = 8;
            scheduler.schedule('a', (i) => {
                assert.equal(2, i);
                itr += i;
                co.sleep(1);
                n += i;
                if (n === m) {
                    scheduler.cancel('a');
                    sem.release();
                }
            }, 1, 2, [2]);
            console.log('schedule args timer OK');
            sem.acquire();
            try {
                assert.equal(itr, n);
                assert.equal(m, n);
                assert.equal(false, scheduler.closed);
                assert.equal(0, scheduler.taskCount);
            } finally {
                sem.release();
            }
        });

        it ('schedule object task', () => {
            let n = 12;
            let task = {
                m: 1,
                n: 10,
                run(i) {
                    assert.equal(1, this.m);
                    this.n += i;
                    if (this.n === n) {
                        scheduler.cancel('o');
                        sem.release();
                    }
                }
            };

            sem.acquire();
            scheduler.schedule('o', task, 0, 10, [1]);
            assert.equal(10, task.n);
            assert.equal(false, scheduler.closed);
            assert.equal(1, scheduler.taskCount);
            sem.acquire();
            try {
                assert.equal(n, task.n);
                assert.equal(false, scheduler.closed);
                assert.equal(0, scheduler.taskCount);
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
            assert.equal(1, scheduler.taskCount);
            sem.acquire();
            assert.ok(true === a);
            assert.equal(false, scheduler.closed);
            assert.equal(0, scheduler.taskCount);

            scheduler.delay('a', (b) => {
                a = b;
                sem.release();
            }, 10, [false]);
            assert.equal(false, scheduler.closed);
            assert.equal(1, scheduler.taskCount);
            sem.acquire();
            assert.ok(false === a);
            assert.equal(false, scheduler.closed);
            assert.equal(0, scheduler.taskCount);
            sem.release();
        });

        it ('delay object task', () => {
            let task = {
                m: 1,
                n: 10,
                run(i) {
                    assert.equal(1, this.m);
                    this.n += i;
                    sem.release();
                }
            };

            sem.acquire();
            scheduler.delay('o', task, 10, [1]);
            assert.equal(10, task.n);
            assert.equal(false, scheduler.closed);
            assert.equal(1, scheduler.taskCount);
            sem.acquire();
            try {
                assert.equal(11, task.n);
                assert.equal(false, scheduler.closed);
                assert.equal(0, scheduler.taskCount);
            } finally {
                sem.release();
            }
        });

        it ('cancel await', () => {
            let n = 1;
            let a = new co.Semaphore();
            let task = () => {
                n = 2;
                a.release();
                co.sleep(10);
                a.acquire();
                n = 3;
                sem.release();
                let cur = co.current();
                if (cur.canceled) return;
                else n = 4;
            };

            sem.acquire();
            scheduler.delay('a', task, 0);
            assert.equal(false, scheduler.closed);
            assert.equal(1, scheduler.taskCount);
            scheduler.cancel('a', true);
            assert.equal(false, scheduler.closed);
            assert.equal(0, scheduler.taskCount);

            a.acquire();
            scheduler.delay('a', task, 0);
            a.acquire();
            assert.equal(false, scheduler.closed);
            assert.equal(1, scheduler.taskCount);
            assert.equal(2, n);

            a.release();
            scheduler.cancel('a', true);
            assert.equal(false, scheduler.closed);
            assert.equal(0, scheduler.taskCount);
            assert.equal(3, n);
        });

        it ('shutdown', () => {
            scheduler.shutdown(true);
            assert.equal(true, scheduler.closed);
            assert.equal(false, scheduler.concur);
            assert.equal(0, scheduler.taskCount);
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
            assert.equal(0, scheduler.taskCount);
        });

        it ('schedule', () => {
            let n = 0, m = 2, itr = n;
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
            assert.equal(0, scheduler.taskCount);
            
            m = 8;
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
            }, 1, 2, [2]);
            console.log('schedule args timer OK');
            sem.acquire();
            try {
                assert.ok(itr > n);
                assert.equal(m, n);
                assert.equal(false, scheduler.closed);
                assert.equal(0, scheduler.taskCount);
            } finally {
                sem.release();
            }
        });

        it ('shutdown', () => {
            scheduler.shutdown();
            assert.equal(true, scheduler.closed);
            assert.equal(true, scheduler.concur);
            assert.equal(0, scheduler.taskCount);
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
