const TypeHelper = require("../../util/type-helper");
const StringHelper = require("../../util/string-helper");

class FirewallConfig {

    #whiteHosts = new Map();
    #whiteHostMasks = new Map();

    #blacklist = [];
    #check = false;

    constructor() {
        
    }

    init() {
        // NOOP
    }

    /** A Map: host pattern -> user configs */
    get whiteHostMasks() {
        return this.#whiteHostMasks;
    }

    set whiteHostMasks(masks) {
        this.#whiteHostMasks = TypeHelper.ensureInstanceof(masks, Map, 'whiteHostMasks');
    }

    /** A Map: host name -> user configs */
    get whiteHosts() {
        return this.#whiteHosts;
    }

    set whiteHosts(hosts) {
        this.#whiteHosts = TypeHelper.ensureInstanceof(hosts, Map, 'whiteHosts');
    }

    get blacklist() {
        return this.#blacklist;
    }

    set blacklist(blacklist) {
        this.#blacklist = TypeHelper.ensureInstanceof(blacklist, Array, 'blacklist');
    }

    get check() {
        return this.#check;
    }

    set check(check) {
        this.#check = (true === check || 'true' === check);
    }

    addWhiteHost(host, users) {
        StringHelper.ensureNotBlank(host, 'host');
        if (this.whiteHostExists(host)) {
            return false;
        }

        if (host.indexOf('*') != -1 || host.indexOf('%') != -1) {
            let pattern = FirewallConfig.createHostMaskPattern(host);
            this.whiteHostMasks.set(pattern, users);
        } else {
            this.whiteHosts.set(host, users);
        }

        return true;
    }

    whiteHostExists(host) {
        return this.whiteHosts.has(host);
    }

    static createHostMaskPattern(host) {
        StringHelper.ensureNotBlank(host, 'host');
        host = host.replace(/\./g, '\\\\.');
        host = host.replace(/\*/g, '[0-9]*');
        host = host.replace(/%/g, '[0-9]*');

        return new RegExp(host);
    }

    static createHostMask(pattern) {
        TypeHelper.ensureInstanceof(pattern, RegExp, 'hostMaskPattern');
        let p = pattern.toString();
        let i = p.indexOf('/');

        if (i === 0) p = p.slice(1);
        i = p.lastIndexOf('/');
        if (i !== -1) p = p.slice(0, i);

        p = p.replace(/\\\\./g, '.');
        p = p.replace(/\[0\-9\]\*/g, '*');

        return p;
    }

}

module.exports = FirewallConfig;
