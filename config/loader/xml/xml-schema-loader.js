const SystemConfig = require('../../system-config');
const ConfigError = require('../../config-error');
const DataHostConfig = require('../model/data-host-config');
const PhysicalDBPool = require('../../../backend/datasource/physical-db-pool');

const fs = require('fs');
const path = require('path');
const xml = require('xml');

class XMLSchemaLoader {

    static #DEFAULT_DTD = "schema.dtd"; // Ignore: no dtd check feature in fibjs xml
    static #DEFAULT_XML = "schema.xml";

    #dataHosts = {};

    constructor(schemaFile, ruleFile) {
        if (!schemaFile) {
            const home = SystemConfig.getHomePath();
            schemaFile = path.resolve(home, "conf", XMLSchemaLoader.#DEFAULT_XML);
        }
        let parser = new Parser(this);
        parser.parse(XMLSchemaLoader.#DEFAULT_DTD, schemaFile);
    }

    get dataHosts() {
        return this.#dataHosts;
    }

} // XMLSchemaLoader

class Parser {

    #loader;

    constructor(loader) {
        this.#loader = loader;
    }

    parse(dtdFile, schemaFile) {
        let source = fs.readFile(schemaFile, 'utf-8');
        let root = xml.parse(source);

        this.parseDataHosts(root);
    }

    parseDataHosts(root) {
        const dataHosts = this.#loader.dataHosts;
        let hosts = root.getElementsByTagName('dataHost');
        let n = hosts.length;

        for (let i = 0; i < n; ++i) {
            let host = hosts[i];
            let attrs = host.attributes;
            let attr = attrs.getNamedItem('name');

            if (!attr) {
                throw new ConfigError(`No name attr in the dataHost ${i + 1}`);
            }
            const name = attr.value;
            if (dataHosts[name]) {
                throw new ConfigError(`The dataHost ${i + 1} name '${name}' duplicated`);
            }

            const maxCon = this.parseIntAttr('maxCon', host, name);
            const minCon = this.parseIntAttr('minCon', host, name);
            const balance = this.parseIntAttr('balance', host, name);
            const balanceType = this.parseIntAttr('balanceType', host, name, 0);
            const switchType = this.parseIntAttr('switchType', host, name, -1);
            const slaveThreshold = this.parseIntAttr('slaveThreshold', host, name, -1);
            const tempReadHostAvailable = this.parseIntAttr('tempReadHostAvailable', 
                host, name, 0) > 0;
            const writeType = this.parseIntAttr('writeType', host, name, 0);

            const dbDriver = this.parseStrAttr('dbDriver', host, name, '');
            const dbType = this.parseStrAttr('dbType', host, name);
            const filters = this.parseStrAttr('filters', host, name, '');
            const defLogTime = PhysicalDBPool.LOG_TIME;
            const logTime = this.parseIntAttr('logTime', host, name, defLogTime);
            const slaveIDs = this.parseStrAttr('slaveIDs', host, name, null);
            const maxRetryCount = this.parseIntAttr('maxRetryCount', host, name, 3);

            const defNotSwitch = DataHostConfig.CAN_SWITCH_DS;
            const notSwitch = this.parseStrAttr('notSwitch', host, name, defNotSwitch);
            const heartbeatSQL = this.parseChildElement('heartbeat', host, name);
            const initConSQL = this.parseChildElement('connectionInitSql', host, name, null);
        
            // TODO: parse writeHost, readHost

            const config = new DataHostConfig(name, dbType, dbDriver, null, null, 
                switchType, slaveThreshold, tempReadHostAvailable);
            config.maxCon = maxCon;
            config.minCon = minCon;
            config.balance = balance;
            config.balanceType = balanceType;
            config.writeType = writeType;
            config.heartbeatSQL = heartbeatSQL;
            config.connectionInitSql = initConSQL;
            config.filters = filters;
            config.logTime = logTime;
            config.slaveIDs = slaveIDs;
            config.notSwitch = notSwitch;
            config.maxRetryCount = maxRetryCount;

            dataHosts[name] = config;
        }
    }

    parseChildElement(tag, parent, paName, def) {
        const paTag = parent.tagName;
        let children = parent.getElementsByTagName(tag);
        if (children.length == 0) {
            if (def === undefined)
                throw new ConfigError(`No '${tag}' child in ${paTag} '${paName}'`);
            else
                return def;
        } else {
            return children[0].textContent;
        }
    }

    parseStrAttr(name, elem, elName, def) {
        const tag = elem.tagName;
        const attrs = elem.attributes;
        const attr = attrs.getNamedItem(name);

        if (!attr && def !== undefined) return def;
        
        if (!attr) throw new ConfigError(`No ${name} attr in the ${tag} '${elName}'`);
        else return attr.value;
    }

    parseIntAttr(name, elem, elName, def) {
        const tag = elem.tagName;
        const attrs = elem.attributes;
        const attr = attrs.getNamedItem(name);

        if ((!attr || attr.value == '') && !isNaN(def)) return def;

        if (!attr) {
            throw new ConfigError(`No ${name} attr in the ${tag} '${elName}'`);
        }
        
        const n = parseInt(attr.value);
        if (isNaN(n)) {
            throw new ConfigError(`${name} '${attr.value}' not int in the ${tag} '${elName}'`);
        }

        return n;
    }

} // Parser

module.exports = XMLSchemaLoader;
