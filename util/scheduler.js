const TypeHelper = require("./type-helper");

/**
 * A manager of named timers.
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

    get timerCount() {
        return this.#timers.size;
    }

    schedule(name, timer, initDelay, period, args) {
        if (this.closed) {
            throw new Error(`Scheduler has been closed!`);
        }
        if (this.#timers.has(name)) {
            throw new Error(`The timer '${name}' is existing!`);
        }
        TypeHelper.ensureInstanceof(timer, Function, 'timer');

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
            try {
                timer(... args);
            } finally {
                if (per) {
                    let fin = true;
                    let tm = setInterval(() => {
                        if (fin || this.concur) {
                            try {
                                fin = false;
                                timer(... args);
                            } finally {
                                fin = true;
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

        this.#timers.set(name, tm);
    }

    delay(name, timer, delay, args) {
        this.schedule(name, timer, delay, undefined, args);
    }

    cancel(name) {
        let tm = this.#timers.get(name);
        if (tm) {
            if (tm.per) clearInterval(tm);
            else clearTimeout(tm);
            this.#timers.delete(name);
            return true;
        } else {
            return false;
        }
    }

    shutdown() {
        let timers = this.#timers;

        this.#closed = true;
        for (let tm of timers.values()) {
            if (tm.per) clearInterval(tm);
            else clearTimeout(tm);
        }
        timers.clear();
    }

}

module.exports = Scheduler;
