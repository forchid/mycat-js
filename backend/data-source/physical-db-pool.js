class PhysicalDBPool {

    /** The load balance: all read operations only dispatched to 
     * all available writeHosts(read/write splitting off). */
    static get BALANCE_NONE() {
        return 0;
    }

    /** The load balance: all read operations can be dispatched to 
     * all readHosts and stand-by writeHosts(read/write splitting on). */
    static get BALANCE_ALL_BACK() {
        return 1;
    }

    /** The load balance: read operations can be dispatched to 
     * readHosts and writeHosts randomly(read/write splitting on). */
    static get BALANCE_ALL() {
        return 2;
    }

    /** The load balance: all read operations only be dispatched to 
     * readHosts randomly(read/write splitting on). */
    static get BALANCE_ALL_READ() {
        return 3;
    }

    static get RANDOM() {
        return 0;
    }

    /** The write type: all write operations only dispatched to 
     * the current writeHost. */
    static get WRITE_ONLYONE_NODE() {
        return 0;
    }

    /** The write type: write operations randomly dispatched to 
     * a writeHost. */
    static get WRITE_RANDOM_NODE() {
        return 1;
    }

    static get LOG_TIME() {
        return 300000;
    }

    static get WEIGHT() {
        return 0;
    }
}

module.exports = PhysicalDBPool;
