class ClusterConfig {

    #nodes = new Map();
    #groups = new Map();

    constructor(nodes, groups) {
        this.#nodes = nodes;
        this.groups = groups;
    }

    get nodes() { return this.#nodes; }

    get groups() { return this.#groups; }
}

module.exports = ClusterConfig;
