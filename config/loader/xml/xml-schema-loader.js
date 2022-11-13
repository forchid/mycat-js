const SystemConfig = require('../../model/system-config');
const ConfigError = require('../../config-error');
const DataHostConfig = require('../../model/data-host-config');
const PhysicalDBPool = require('../../../backend/data-source/physical-db-pool');
const StringSplitter = require('../../../util/string-splitter');
const DBHostConfig = require('../../model/db-host-config');
const DataNodeConfig = require('../../model/data-node-config');
const XMLRuleLoader = require('./xml-rule-loader');
const XmlHelper = require('./xml-helper');
const TypeHelper = require('../../../util/type-helper');

const fs = require('fs');
const path = require('path');
const xml = require('xml');
const url = require('url');
const SchemaConfig = require('../../model/schema-config');
const TableConfig = require('../../model/table-config');

class XMLSchemaLoader {

    // Ignore DTD: no dtd validation in fibjs xml
    static #DEFAULT_DTD = 'schema.dtd';
    static #DEFAULT_XML = 'schema.xml';

    #dataHosts = new Map();
    #dataNodes = new Map();
    #tableRules= new Map();
    #schemas = new Map();

    constructor(schemaFile, ruleFile) {
        let ruleLoader = new XMLRuleLoader(ruleFile);
        this.#tableRules = ruleLoader.tableRules;

        if (!schemaFile) {
            const baseDir = SystemConfig.confPath;
            schemaFile = path.resolve(baseDir, XMLSchemaLoader.#DEFAULT_XML);
        }
        let parser = new Parser(this);
        parser.parse(XMLSchemaLoader.#DEFAULT_DTD, schemaFile);
    }

    /** A map:  dataHost name -> DataHostConfig */
    get dataHosts() { return this.#dataHosts; }

    /** A map: dataNode name -> DataNodeConfig */
    get dataNodes() { return this.#dataNodes; }

    /** A map: tableRule name -> TableRuleConfig */
    get tableRules() { return this.#tableRules; }

    /** A map: schema name -> SchemaConfig */
    get schemas() { return this.#schemas; }

} // XMLSchemaLoader

class Parser {

    #loader;
    #file;

    constructor(loader) {
        this.#loader = loader;
    }

    parse(dtdFile, schemaFile) {
        let root;
        {
            let s = fs.readFile(schemaFile, SystemConfig.ENCODING);
            root = xml.parse(s);
            this.#file = schemaFile;
        }

        this.parseDataHosts(root);
        this.parseDataNodes(root);
        this.parseSchemas(root);
    }

    get file() { return this.#file; }

    parseSchemas(root) {
        const schElements = root.getElementsByTagName('schema');
        const n = schElements.length;

        for (let i = 0; i < n; ++i) {
            const schElem = schElements[i];
            const schAttrs = schElem.attributes;
            const m = schAttrs.length;
            const name = XmlHelper.parseStrAttr('name', schElem).toUpperCase();
            let dataNode = '', randomDataNode = '', sqlMaxLimit = -1;
            let checkSQLschema = false, defDbType = '';

            for (let j = 0; j < m; ++j) {
                const schAttr = schAttrs[j];
                const attrName = schAttr.name;
                switch (attrName) {
                    case 'name':
                        // Parsed
                        break;
                    case 'dataNode':
                        dataNode = XmlHelper.parseStrAttr(attrName, schElem, name, '');
                        break;
                    case 'randomDataNode':
                        randomDataNode = XmlHelper.parseStrAttr(attrName, schElem, name, '');
                        break;
                    case 'checkSQLschema':
                        checkSQLschema = XmlHelper.parseStrAttr(attrName, schElem, name, '') 
                            === 'true';
                        break;
                    case 'sqlMaxLimit':
                        sqlMaxLimit = XmlHelper.parseIntAttr(attrName, schElem, name, -1);
                        break;
                    default:
                        throw new ConfigError(`Unknown attr ${attrName} in the schema ${i + 1}`);
                }
            }

            if (dataNode) {
                let dnList = [dataNode];
                this.checkDataNodeExists(dnList);
                let dataNodes = this.#loader.dataNodes;
                let dataHost = dataNodes.get(dataNode).dataHost;
                let dataHosts = this.#loader.dataHosts;
                defDbType = dataHosts.get(dataHost).dbType;
            }

            const tables = this.parseTables(name, schElem);
            const schemas = this.#loader.schemas;
            if (schemas.has(name)) {
                throw new ConfigError(`schema '${name}' duplicated!`);
            }
            if (tables.size === 0 && dataNode === '') {
                let er = `schema '${name}' no table, so attribute dataNode required!`;
                throw new ConfigError(er);
            }

            const schConfig = new SchemaConfig(name, dataNode, tables, sqlMaxLimit, 
                checkSQLschema, randomDataNode);
            if (defDbType !== '') {
                schConfig.defaultDataNodeDbType = defDbType;
                if ('mysql' !== defDbType.toLowerCase()) {
                    schConfig.needSupportMultiDBType = true;
                }
            }
            
            // TODO
        }
    }

    parseTables(schemaName, schemaElem) {
        const tabElements = schemaElem.getElementsByTagName('table');
        const n = tabElements.length;
        const newTabs = [];

        for (let i = 0; i < n; ++i) {
            const tabElem = tabElements[i];
            const tabName = XmlHelper.parseStrAttr('name', tabElem);
            // splitTableNames: Multi-tables share a same config
            const splitTab = 'true' === XmlHelper.parseStrAttr('splitTableNames', 
                tabElem, tabName, '');
            
            if (splitTab) {
                const tabNames = StringSplitter.split(tabElem, ',');
                tabNames.forEach(tabName => {
                    let cloneElem = tabElem.cloneNode(true);
                    cloneElem.setAttribute('name', tabName);
                    newTabs.push(cloneElem);
                });
            } else {
                newTabs.push(tabElem);
            }
        }

        return this.doParseTables(schemaName, newTabs);
    }

    doParseTables(schemaName, tabElements) {
        const tables = new Map();
        const n = tabElements.length;

        for (let i = 0; i < n; ++i) {
            const tabElem = tabElements[i];
            const tabName = XmlHelper.parseStrAttr('name', tabElem).toUpperCase();
            let tableNames = [tabName];
            const nameSuffix = XmlHelper.parseStrAttr('nameSuffix', tabElem, tabName, '');

            if (nameSuffix) {
                tableNames = XmlHelper.parseTableNameSuffix(tabName, nameSuffix);
            }
            let primaryKey = XmlHelper.parseStrAttr('primaryKey', tabElem, tabName, '');
            if (!primaryKey) primaryKey = primaryKey.toUpperCase();
            const autoIncrement = 'true' === XmlHelper.parseStrAttr('autoIncrement', 
                tabElem, tabName, '');
            const fetchStoreNodeByJdbc = 'true' === XmlHelper.parseStrAttr('fetchStoreNodeByJdbc',
                tabElem, tabName, '');
            const needAddLimit = 'true' === XmlHelper.parseStrAttr('needAddLimit', 
                tabElem, tabName, 'true');
            let tabType = TableConfig.TYPE_GLOBAL_DEFAULT;
            if ('global' === XmlHelper.parseStrAttr('type', tabElem, tabName, '')) {
                tabType = TableConfig.TYPE_GLOBAL_TABLE;
            }

            const ruleName = XmlHelper.parseStrAttr('rule', tabElem, tabName, '');
            let rule = null, ruleRequired = false;
            if (ruleName) {
                rule = this.#loader.tableRules.get(ruleName);
                if (!rule) throw new ConfigError(`The rule '${ruleName}' in ${this.file} not defined!`);
            }
            ruleRequired = 'true' === XmlHelper.parseStrAttr('ruleRequired', 
                tabElem, tabName, '');
            
            let dataNode = XmlHelper.parseStrAttr('dataNode', tabElem, tabName, '');
            const distPrefix = 'distribute(';
            const distTableDns = dataNode.startsWith(distPrefix);
            if (distTableDns) {
                if (!dataNode.endsWith(')')) {
                    throw new ConfigError(`dataNode format error in table '${tabName}'`);
                }
                dataNode = dataNode.slice(distPrefix.length, dataNode.length - 1);
            }

            const subTables = XmlHelper.parseStrAttr('subTables', tabElem, tabName, '');
            const m = tableNames.length;
            for (let j = 0; j < m; ++j) {
                const tableName = tableNames[j];
                let tableRule = rule;

                // 1. TODO TableRuleAware creation
                const tableConf = new TableConfig({ tableName, primaryKey,
                    autoIncrement, needAddLimit, tableType: tabType, dataNode,
                    dbTypes: this.getDbTypes(dataNode),
                    rule: tableRule ? tableRule.rule : null,
                    ruleRequired, parent: null, childTable: false, 
                    joinKey: '', parentKey: '', subTables, fetchStoreNodeByJdbc });
                // 2. TODO TableRuleAware init

                if (tableConf.rule) this.checkRuleSuitTable(tableConf);
                if (distTableDns) this.distributeDataNodes(tableConf.dataNodes);
                if (tables.has(tableName)) {
                    throw new ConfigError(`table '${tableName}' in schema '${schemaName}' duplicated!`);
                } else {
                    tables.set(tableName, tableConf);
                }
            } // for-table-names

            if (m === 1) {
                const tabConfig = tables.get(tableNames[0]);
                this.processChildTables(tables, tabConfig, dataNode, tabElem);
            } else {
                let chElements = tabElem.getElementsByTagName('childTable');
                if (chElements.length > 0) {
                    let e = `table '${tabName}' which name represents multi-tables can't have childTable!`;
                    throw new ConfigError(e);
                }
            }
        } // for-table-elements

        return tables;
    }

    processChildTables(tables, parent, dataNode, parElem) {
        const childNodes = parElem.childNodes;
        const n = childNodes.length;

        for (let i = 0; i < n; ++i) {
            const childNode = childNodes[i];
            if ('childTable' !== childNode.nodeName) {
                continue;
            }

            const chName = XmlHelper.parseStrAttr('name', childNode);
            const primaryKey = XmlHelper.parseStrAttr('primaryKey', 
                childNode, chName, '').toUpperCase();
            const autoIncrement = 'true' === XmlHelper.parseStrAttr('autoIncrement', 
                childNode, chName, '');
            const needAddLimit = 'true' === XmlHelper.parseStrAttr('needAddLimit', 
                childNode, chName, 'true');
            const subTables = XmlHelper.parseStrAttr('subTables', 
                childNode, chName, '');
            const joinKey = XmlHelper.parseStrAttr('joinKey', 
                childNode, chName, '').toUpperCase();
            const parentKey = XmlHelper.parseStrAttr('parentKey', 
                childNode, chName, '').toUpperCase();
            
            const childTable = new TableConfig({ tableName: chName, primaryKey,
                autoIncrement, needAddLimit,
                tableType: TableConfig.TYPE_GLOBAL_DEFAULT, dataNode,
                dbTypes: this.getDbTypes(dataNode), 
                rule: null, ruleRequired: false, parent, childTable: true,
                joinKey, parentKey, subTables, fetchStoreNodeByJdbc: false });
            
            if (tables.has(chName)) {
                throw new ConfigError(`table '${chName}' duplicated!`);
            } else {
                tables.set(chName, childTable);
                this.processChildTables(tables, childTable, dataNode, childNode);
            }
        }
    }

    // TODO: What motivation for this?
    distributeDataNodes(nodeNames) {
        const cache = new Map();
        const dataNodes = this.#loader.dataNodes;
        const newNames = [];

        nodeNames.forEach(name => {
            let dn = dataNodes.get(name);
            let dh = dn.dataHost;
            let dns = cache.get(dh);
            if (dns) dns.push(name);
            else cache.set(dn, dns = [name]);
        });

        let over = false;
        while (!over) {
            over = true;
            for (let [key, value] of cache) {
                if (value.length > 0) {
                    let name = value.shift();
                    newNames.push(name);
                    over = false;
                }
            }
        }
        nodeNames.splice(0, nodeNames.length);
        nodeNames.splice(0, 0, ... newNames);
    }

    checkRuleSuitTable(tableConf) {
        const algo = tableConf.rule.algorithm;
        const name = tableConf.name;
        const funName = algo.functionName;
        const dnSize = tableConf.dataNodes.length;
        const parNum = algo.partitionNum;
        const value = algo.suitableFor(tableConf);
        
        if (value == -1) {
            let e = `Table '${name}' dataNode count ${dnSize} less than it's rule '${funName}' partition size ${parNum}!`;
            throw new ConfigError(e);
        } else if (value == 1) {
            let m = `Table '${name}' dataNode count ${dnSize} great than it's rule '${funName}' partition size ${parNum}, so some dataNodes redundant`;
            console.warn(m);
        } else {
            // OK
        }
    }

    getDbTypes(dataNode) {
        const dbTypes = new Set();
        const dataNodes = StringSplitter.range3(dataNode, ',', '$', '-');
        const dnConfigs = this.#loader.dataNodes;
        const dhConfigs = this.#loader.dataHosts;

        dataNodes.forEach(dn => {
            const dnc = dnConfigs.get(dn);
            const dhc = dhConfigs.get(dnc.dataHost);
            dbTypes.add(dhc.dbType);
        });

        return dbTypes;
    }

    /**
     * Parse dynamic month or day table by nameSuffix.
     * 1) month table: the suffix format 'YYYYMM,yyyy,mm,months';
     * 2) day table: the suffix format 'YYYYMMDD,yyyy,mm,day,days'.
     */
    parseTableNameSuffix(tabName, nameSuffix) {
        const tableNames = [];
        let params = StringSplitter.split(nameSuffix, ',');

        if (params.length < 4) {
            throw new ConfigError(`nameSuffix '${nameSuffix}' malformed in table '${tabName}'`);
        }
        let format = params[0].toUpperCase();
        if ('YYYYMM' === format) {
            if (params.length != 4) {
                throw new ConfigError(`nameSuffix '${nameSuffix}' malformed in table '${tabName}'`);
            }
            const year = TypeHelper.parseIntDecimal(params[1], `year part of '${nameSuffix}'`);
            const month = TypeHelper.parseIntDecimal(params[2], `month part of '${nameSuffix}'`);
            const months = TypeHelper.parseIntDecimal(params[3], `months part of '${nameSuffix}'`);
            if (month < 1 || month > 12) {
                throw new ConfigError(`month part of '${nameSuffix}' must in [1, 12] in table '${tabName}'`);
            }
            if (months < 1) {
                throw new ConfigError(`months part of '${nameSuffix}' must bigger than 0 in table '${tabName}'`);
            }
            let cal = new Date(year, month - 1);
            for (let i = 0; i < months; ++i) {
                let y = cal.getFullYear();
                let m = cal.getMonth() + 1;
                tableNames.push(tabName + y + (m < 10? '0'+m: m));
                cal.setMonth(m);
            }
        } else if ('YYYYMMDD' === format) {
            if (params.length != 5) {
                throw new ConfigError(`nameSuffix '${nameSuffix}' malformed in table '${tabName}'`);
            }
            const year = TypeHelper.parseIntDecimal(params[1], `year part of '${nameSuffix}'`);
            const month = TypeHelper.parseIntDecimal(params[2], `month part of '${nameSuffix}'`);
            const day = TypeHelper.parseIntDecimal(params[3], `day part of '${nameSuffix}'`);
            const days = TypeHelper.parseIntDecimal(params[4], `day part of '${nameSuffix}'`);
            if (month < 1 || month > 12) {
                throw new ConfigError(`month part of '${nameSuffix}' must in [1, 12] in table '${tabName}'`);
            }
            if (day < 1) {
                throw new ConfigError(`day part of '${nameSuffix}' must bigger than 0 in table '${tabName}'`);
            }
            let cal = new Date(year, month - 1, day);
            for (let i = 0; i < days; ++i) {
                let y = cal.getFullYear();
                let m = cal.getMonth() + 1;
                let d = cal.getDate();
                tableNames.push(tabName + y + (m < 10? '0'+m: m) + (d < 10? '0'+d: d));
                cal.setDate(d + 1);
            }
        } else {
            throw new ConfigError(`The nameSuffix format '${nameSuffix}' in table '${tabName}' not supported!`);
        }

        return tableNames;
    }

    checkDataNodeExists(dnList) {
        const dataNodes = this.#loader.dataNodes;
        dnList.forEach(dn => {
            if (!dataNodes.has(dn)) {
                throw new ConfigError(`dataNode '${dn}' is not found!`);
            }
        });
    }

    parseDataNodes(root) {
        let nodeElements = root.getElementsByTagName('dataNode');
        let n = nodeElements.length;

        for (let i = 0; i < n; ++i) {
            let nodeElem = nodeElements[i];
            let attrs = nodeElem.attributes;
            let attr = attrs.getNamedItem('name');
            const name = attr? attr.value.trim(): null;
            if (!name) {
                throw new ConfigError(`dataNode ${i + 1} no name attr value!`);
            }
            const database = XmlHelper.parseStrAttr('database', nodeElem, name);
            const dataHost = XmlHelper.parseStrAttr('dataHost', nodeElem, name);
            let [fi, se, th] = [',', '$', '-'];
            const dnNames = StringSplitter.range3(name, fi, se, th);
            const databases = StringSplitter.range3(database, fi, se, th);
            const dataHosts = StringSplitter.range3(dataHost, fi, se, th);

            let n = dnNames.length;
            if (n != dataHosts.length * databases.length) {
                throw new ConfigError(`dataNode '${name}' define error: name count != dataHost count * database count`);
            }
            if (n > 1) {
                let hdNames = this.mergeHostDatabases(dataHosts, databases);
                hdNames.forEach((hd, i) => 
                    this.createDataNode(dnNames[i], hd.database, hd.dataHost));
            } else {
                this.createDataNode(dnNames[0], databases[0], dataHosts[0]);
            }
        }
    }

    mergeHostDatabases(dataHosts, databases) {
        const res = [];
        dataHosts.forEach(dataHost => 
            databases.forEach(database => 
                res.push({database, dataHost})));
        return res;
    }

    createDataNode(name, database, dataHost) {
        const conf = new DataNodeConfig(name, database, dataHost);
        const dataHosts = this.#loader.dataHosts;
        const dataNodes = this.#loader.dataNodes;

        if (dataNodes.has(name)) {
            throw new ConfigError(`dataNode '${name}' duplicated!`);
        }
        const hostConf = dataHosts.get(dataHost);
        if (!hostConf) {
            throw new ConfigError(`dataNode '${name}' references dataHost: '${dataHost}' not exists!`);
        }
        hostConf.addDataNode(name);
        dataNodes.set(name, conf);
    }

    parseDataHosts(root) {
        const dataHosts = this.#loader.dataHosts;
        let hosts = root.getElementsByTagName('dataHost');
        let n = hosts.length;

        for (let i = 0; i < n; ++i) {
            let host = hosts[i];
            const name = XmlHelper.parseStrAttr('name', host, i + 1);

            if (dataHosts.has(name)) {
                throw new ConfigError(`The dataHost ${i + 1} name '${name}' duplicated`);
            }

            const maxCon = XmlHelper.parseIntAttr('maxCon', host, name);
            const minCon = XmlHelper.parseIntAttr('minCon', host, name);
            const balance = XmlHelper.parseIntAttr('balance', host, name);
            const balanceType = XmlHelper.parseIntAttr('balanceType', host, name, 0);
            const switchDef = DataHostConfig.DEFAULT_SWITCH_DS;
            const switchType = XmlHelper.parseIntAttr('switchType', host, name, switchDef);
            const slaveThreshold = XmlHelper.parseIntAttr('slaveThreshold', host, name, -1);
            const tempReadHostAvailable = XmlHelper.parseIntAttr('tempReadHostAvailable', 
                host, name, 0) > 0;
            const writeType = XmlHelper.parseIntAttr('writeType', host, name, 0);

            const dbDriver = XmlHelper.parseStrAttr('dbDriver', host, name, '');
            const dbType = XmlHelper.parseStrAttr('dbType', host, name);
            const filters = XmlHelper.parseStrAttr('filters', host, name, 'mergeStat');
            const defLogTime = PhysicalDBPool.LOG_TIME;
            const logTime = XmlHelper.parseIntAttr('logTime', host, name, defLogTime);
            const slaveIDs = XmlHelper.parseStrAttr('slaveIDs', host, name, '');
            const maxRetryCount = XmlHelper.parseIntAttr('maxRetryCount', host, name, 3);

            const defNotSwitch = DataHostConfig.CAN_SWITCH_DS;
            const notSwitch = XmlHelper.parseStrAttr('notSwitch', host, name, defNotSwitch);
            const heartbeatSQL = XmlHelper.parseChildText('heartbeat', host, name);
            const initConSQL = XmlHelper.parseChildText('connectionInitSql', host, name, '');
        
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
        const host = XmlHelper.parseStrAttr('host', hostNode);
        const tagName = hostNode.tagName;

        const urls = XmlHelper.parseStrAttr('url', hostNode, host);
        const user = XmlHelper.parseStrAttr('user', hostNode, host);
        const password = XmlHelper.parseStrAttr('password', hostNode, host, '');
        const usingDecrypt = XmlHelper.parseStrAttr('usingDecrypt', hostNode, host, '');
        const checkAlive = 'true' == XmlHelper.parseStrAttr('checkAlive', hostNode, host, 'true');
        const defWeight = PhysicalDBPool.WEIGHT;
        const weight = XmlHelper.parseIntAttr('weight', hostNode, host, defWeight);

        // TODO: decrypt password if usingDecrypt
        const passwordEncrypt = password;

        let ip;
        let port;
        if ('native' == dbDriver.toLowerCase()) {
            let i = urls.indexOf(':');
            if (i == -1) {
                throw new ConfigError(`url '${urls}' format error in ${tagName} '${host}'`);
            }
            ip = urls.slice(0, i).trim();
            port = urls.slice(i + 1).trim();
            port = TypeHelper.parseIntDecimal(port, 'port');
        } else {
            let u = urls.slice(5);
            u = url.parse(u, false, true);
            ip = u.hostname;
            port = TypeHelper.parseIntDecimal(u.port, 'port');
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

} // Parser

module.exports = XMLSchemaLoader;
