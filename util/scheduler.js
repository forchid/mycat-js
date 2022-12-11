const TypeHelper = require("./type-helper");
const co = require('coroutine');
const CoHelper = require("./co-helper");

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

    hasTask(name) {
        return this.#timers.has(name);
    }

    schedule(name, task, initDelay, period, args) {
        if (this.closed) {
            throw new Error(`Scheduler has been closed!`);
        }
        if (this.hasTask(name)) {
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

        let tm = setTimeout(() => {
            const cur = co.current();
            try {
                CoHelper.name = name;
                cur.canceled = false;
                tm._cos = [cur];
                if (isFun) task(... args);
                else task.run(... args);
            } finally {
                delete tm._cos;
                delete cur.canceled;
                if (per) {
                    let fin = true;
                    let tm = setInterval(() => {
                        if (fin || this.concur) {
                            const cur = co.current();
                            tm._cos = tm._cos || [];
                            try {
                                CoHelper.name = name;
                                fin = false;
                                cur.canceled = false;
                                tm._cos.push(cur);
                                if (isFun) task(... args);
                                else task.run(... args);
                            } finally {
                                fin = true;
                                let i = 0;
                                const n = tm._cos.length;
                                for (; i < n; ) {
                                    let c = tm._cos[i];
                                    if (c === cur) break;
                                    ++i;
                                }
                                if (n === 1) delete tm._cos;
                                else tm._cos.splice(i, 1);
                                delete cur.canceled;
                            }
                        }
                    }, period);
                    tm._per = true;
                    this.#timers.set(name, tm);
                } else {
                    this.#timers.delete(name);
                }
            }
        }, initDelay);
        tm._per = false;

        this.#timers.set(name, tm);
    }

    delay(name, task, delay, args) {
        this.schedule(name, task, delay, undefined, args);
    }

    cancel(name, await) {
        let tm = this.#timers.get(name);
        if (tm) {
            if (tm._per) clearInterval(tm);
            else clearTimeout(tm);

            let cos = tm._cos;
            for (; await && cos && cos.length; ) {
                let c = cos[0];
                c.canceled = true;
                c.join();
                cos = tm._cos;
            }
            
            this.#timers.delete(name);
            return true;
        } else {
            return false;
        }
    }

    cancelAll(await) {
        let timers = this.#timers;
        for (let tm of timers.values()) {
            if (tm._per) clearInterval(tm);
            else clearTimeout(tm);

            let cos = tm._cos;
            for (; await && cos && cos.length; ) {
                let c = cos[0];
                c.canceled = true;
                c.join();
                cos = tm._cos;
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
