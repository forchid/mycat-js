const XMLConfigLoader = require("./loader/xml/xml-config-loader");
const XMLSchemaLoader = require("./loader/xml/xml-schema-loader");
const XMLServerLoader = require("./loader/xml/xml-server-loader");

class ConfigInitializer {

    #system = null;
	#cluster = null;
	#firewall = null;
	#users = new Map();
	#schemas = new Map();
	#dataNodes = new Map();
	#dataHosts = new Map();

    constructor(options) {
        options = options || {};
        let schemaLoader = new XMLSchemaLoader(options.schemaFile, options.ruleFile);
        let serverLoader = new XMLServerLoader(options.serverFile);
        let configLoader = new XMLConfigLoader(schemaLoader, serverLoader);

        this.#system = configLoader.system;
        this.#users = configLoader.users;
        this.#schemas = configLoader.schemas;

        this.#firewall = configLoader.firewall;
    }

}

module.exports = ConfigInitializer;
