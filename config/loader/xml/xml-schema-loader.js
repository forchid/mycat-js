const SystemConfig = require('../../system-config');
const ConfigError = require('../../config-error');
const DataHostConfig = require('../model/data-host-config');
const PhysicalDBPool = require('../../../backend/datasource/physical-db-pool');

const fs = require('fs');
const path = require('path');
const xml = require('xml');
const url = require('url');
const DBHostConfig = require('../model/db-host-config');

class XMLSchemaLoader {

    static #DEFAULT_DTD = "schema.dtd"; // Ignore: no dtd check feature in fibjs xml
    static #DEFAULT_XML = "schema.xml";

    #dataHosts = new Map();

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
            if (dataHosts.has(name)) {
                throw new ConfigError(`The dataHost ${i + 1} name '${name}' duplicated`);
            }
            console.debug('Parse dataHost "%s"', name);

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
        
            // parse writeHost, readHost
            let { writeDbConfs, readHostsMap } = this.parseDbHosts(name, host, dbType, 
                dbDriver, maxCon, minCon, filters, logTime);

            const config = new DataHostConfig(name, dbType, dbDriver,
                writeDbConfs, readHostsMap, switchType, slaveThreshold, 
                tempReadHostAvailable);
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

            dataHosts.set(name, config);
        }
    }

    parseDbHosts(dataHost, dhElem, dbType, dbDriver, maxCon, minCon, filters, logTime) {
        const writeDbConfs = [];
        const readHostsMap = new Map();
        const writeNodes = dhElem.getElementsByTagName('writeHost');
        const writeNodeNames = new Set();
        const n = writeNodes.length;

        for (let i = 0; i < n; ++i) {
            // parse writeHost
            const writeNode = writeNodes[i];
            const writeDbConf = this.parseDbHost(dataHost, writeNode, dbType, dbDriver, 
                maxCon, minCon, filters, logTime);
            let hostName = writeDbConf.hostName;
            if (writeNodeNames.has(hostName)) {
                throw new ConfigError(`writeHost '${hostName}' duplicated!`);
            }
            writeNodeNames.add(hostName);
            writeDbConfs[i] = writeDbConf;

            // parse readHost
            const readNodes = writeNode.getElementsByTagName('readHost');
            const m = readNodes.length;
            if (m > 0) {
                const readDbConfs = [];
                const readNodeNames = new Set();
                for (let j = 0; j < m; ++j) {
                    const readNode = readNodes[i];
                    const readDbConf = this.parseDbHost(dataHost, readNode, 
                        dbType, dbDriver, maxCon, minCon, filters, logTime);
                    hostName = readDbConf.hostName;
                    if (readNodeNames.has(hostName)) {
                        throw new ConfigError(`readHost '${hostName}' duplicated!`);
                    }
                    readNodeNames.add(hostName);
                    readDbConfs[j] = readDbConf;
                }
                readHostsMap.set(i, readDbConfs);
            }
        }

        return { writeDbConfs, readHostsMap };
    }

    parseDbHost(dataHost, hostNode, dbType, dbDriver,  maxCon, minCon, filters, logTime) {
        const tagName = hostNode.tagName;
        const attrs = hostNode.attributes;
        let attr = attrs.getNamedItem('host');
        if (!attr || !attr.value) {
            throw new ConfigError(`No host attr value in dataHost '${dataHost}' child ${tagName}`);
        }
        const host = attr.value;
        console.debug('Parse %s "%s" in dataHost "%s"', tagName, host, dataHost);

        const urls = this.parseStrAttr('url', hostNode, host);
        const user = this.parseStrAttr('user', hostNode, host);
        const password = this.parseStrAttr('password', hostNode, host, '');
        const usingDecrypt = this.parseStrAttr('usingDecrypt', hostNode, host, '');
        const checkAlive = 'true' == this.parseStrAttr('checkAlive', hostNode, host, 'true');
        const defWeight = PhysicalDBPool.WEIGHT;
        const weight = this.parseIntAttr('weight', hostNode, host, defWeight);

        // TODO: decrypt password if usingDecrypt
        const passwordEncrypt = password;

        let ip;
        let port;
        if ('native' == dbDriver.toLowerCase()) {
            let i = urls.indexOf(':');
            if (i == -1) {
                throw new ConfigError(`url '${urls}' format error in ${tagName} '${host}'`);
            }
            ip = a.slice(0, i).trim();
            port = parseInt(a.slice(i + 1).trim());
            if (isNaN(port)) {
                throw new ConfigError(`url '${urls}' port error in ${tagName} '${host}'`);
            }
        } else {
            let u = urls.slice(5);
            u = url.parse(u, false, true);
            ip = u.host;
            port = u.port;
        }

        const config = new DBHostConfig(host, ip, port, urls, user, 
            passwordEncrypt, password, checkAlive);
        config.dbType = dbType;
        config.maxCon = maxCon;
        config.minCon = minCon;
        config.filters = filters;
        config.logTime = logTime;
        config.weight = weight;

        return config;
    }

    parseChildElement(tag, parent, paName, def) {
        const paTag = parent.tagName;
        let children = parent.getElementsByTagName(tag);
        console.debug('Parse child %s in %s "%s"', tag, paTag, paName);

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
        
        let value = attr.value;
        value = value.trim();
        if (value) return value;
        if (def !== undefined) return def;
        throw new ConfigError(`No ${name} attr value in the ${tag} '${elName}'`);
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
