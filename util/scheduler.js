const TypeHelper = require("./type-helper");
const co = require('coroutine');

/**
 * A scheduler for named tasks (include periodic task).
 * 
 * @author little-pan
 * @since 2022-11-20
 */
class Scheduler {

    #timers = new Map();
    #closed = false;
    #concur = false;

    constructor (concur) {
        this.#concur = !!concur;
    }

    get concur() {
        return this.#concur;
    }

    get closed() {
        return this.#closed;
    }

    get taskCount() {
        return this.#timers.size;
    }

    schedule(name, task, initDelay, period, args) {
        if (this.closed) {
            throw new Error(`Scheduler has been closed!`);
        }
        if (this.#timers.has(name)) {
            throw new Error(`The task '${name}' is existing!`);
        }
        const isFun = (task instanceof Function);
        if (!isFun) {
            if (task !== null && task !== undefined) {
                if (!(task.run instanceof Function)) {
                    throw new Error(`The task.run not a function!`);
                }
                // OK
            } else {
                throw new Error(`The task not a function!`);
            }
        }

        TypeHelper.ensureInteger(initDelay, 'initDelay');
        if (initDelay < 0) {
            throw new Error(`initDelay ${initDelay} less than 0`);
        }

        const per = (period !== undefined);
        if (per) {
            TypeHelper.ensureInteger(period, 'period');
            if (period < 0) {
                throw new Error(`period ${period} less than 0`);
            }
        }

        args = args || [];
        TypeHelper.ensureInstanceof(args, Array, 'args');

        const sem = new co.Semaphore(1);
        let tm = setTimeout(() => {
            try {
                sem.acquire();
                if (isFun) task(... args);
                else task.run(... args);
            } finally {
                sem.release();
                if (per) {
                    let fin = true;
                    let tm = setInterval(() => {
                        if (fin || this.concur) {
                            try {
                                fin = false;
                                sem.acquire();
                                if (isFun) task(... args);
                                else task.run(... args);
                            } finally {
                                fin = true;
                                sem.release();
                            }
                        }
                    }, period);
                    tm.per = true;
                    this.#timers.set(name, tm);
                } else {
                    this.#timers.delete(name);
                }
            }
        }, initDelay);
        tm.per = false;
        tm.sem = sem;

        this.#timers.set(name, tm);
    }

    delay(name, task, delay, args) {
        this.schedule(name, task, delay, undefined, args);
    }

    cancel(name, await) {
        let tm = this.#timers.get(name);
        if (tm) {
            let sem = null;
            if (await) {
                sem = tm.sem;
                sem.acquire();
            }
            try {
                if (tm.per) clearInterval(tm);
                else clearTimeout(tm);
                this.#timers.delete(name);
                return true;
            } finally {
                if (sem) sem.release();
            }
        } else {
            return false;
        }
    }

    cancelAll(await) {
        let timers = this.#timers;
        for (let tm of timers.values()) {
            let sem = null;
            if (await) {
                sem = tm.sem;
                sem.acquire();
            }
            try {
                if (tm.per) clearInterval(tm);
                else clearTimeout(tm);
            } finally {
                if (sem) sem.release();
            }
        }
        timers.clear();
    }

    shutdown(await) {
        this.#closed = true;
        this.cancelAll(await);
    }

}

module.exports = Scheduler;
