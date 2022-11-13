const XMLConfigLoader = require("./loader/xml/xml-config-loader");
const XMLSchemaLoader = require("./loader/xml/xml-schema-loader");

class ConfigInitializer {

    #system = null;
	#cluster = null;
	#firewall = null;
	#users = new Map();
	#schemas = new Map();
	#dataNodes = new Map();
	#dataHosts = new Map();

    constructor(loadDataHost) {
        let schemaLoader = new XMLSchemaLoader();
        let configLoader = new XMLConfigLoader(schemaLoader);

        this.#system = configLoader.system;
        this.#users = configLoader.users;
        this.#schemas = configLoader.schemas;

        this.#firewall = configLoader.firewall;
    }

}

module.exports = ConfigInitializer;
