const TypeHelper = require('../../../util/type-helper');
const XMLSchemaLoader = require('./xml-schema-loader');
const XMLServerLoader = require('./xml-server-loader');

/**
 * The whole config based on xml.
 * 
 * @author little-pan
 * @since 2022-11-13
 */
class XMLConfigLoader {

    #dataHosts = new Map();
    #dataNodes = new Map();
    #schemas = new Map();

    #system = null;
    #users = new Map();
    #firewall = null;
    #cluster = null;

    constructor(schemaLoader, serverLoader) {
        serverLoader = serverLoader || new XMLServerLoader();
        TypeHelper.ensureInstanceof(schemaLoader, XMLSchemaLoader, 'schemaLoader');
        TypeHelper.ensureInstanceof(serverLoader, XMLServerLoader, 'serverLoader');
        
        this.#system = serverLoader.system;
        this.#users = serverLoader.users;
        this.#firewall = serverLoader.firewall;
        this.#cluster = serverLoader.cluster;

        this.#dataHosts = schemaLoader.dataHosts;
        this.#dataNodes = schemaLoader.dataNodes;
        this.#schemas = schemaLoader.schemas;
    }

    get dataHosts() { return this.#dataHosts; }

    get dataNodes() { return this.#dataNodes; }

    get schemas() { return this.#schemas; }

    get system() { return this.#system; }

    get users() { return this.#users; }

    get firewall() { return this.#firewall; }

    get cluster() { return this.#cluster; }

}

module.exports = XMLConfigLoader;
