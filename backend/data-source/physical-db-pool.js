class PhysicalDBPool {

    static get BALANCE_NONE() {
        return 0;
    }

    static get RANDOM() {
        return 0;
    }

    static get WRITE_ONLYONE_NODE() {
        return 0;
    }

    static get LOG_TIME() {
        return 300000;
    }

    static get WEIGHT() {
        return 0;
    }
}

module.exports = PhysicalDBPool;
