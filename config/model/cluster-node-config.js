const StringHelper = require("../../util/string-helper");
const TypeHelper = require("../../util/type-helper");

class ClusterNodeConfig {

    #name = '';
    #host = '';
    #port = 0;
    #weight = 0;

    constructor (name, host, port, weight) {
        this.#name = StringHelper.ensureNotBlank(name, 'cluster node name');
        this.#host = StringHelper.ensureNotBlank(host, 'cluster node host');
        this.#port = TypeHelper.ensureInteger(port, 'cluster node port');
        this.#weight = TypeHelper.ensureInteger(weight, 'cluster node weight');
    }

    get name() { return this.#name; }

    get host() { return this.#host; }

    get port() { return this.#port; }

    get weight() { return this.#weight; }

}

module.exports = ClusterNodeConfig;
