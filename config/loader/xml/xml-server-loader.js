const SystemConfig = require("../../model/system-config");
const FirewallConfig = require("../../model/firewall-config");
const XmlHelper = require("./xml-helper");
const ObjectHelper = require("../../../util/object-helper");
const UserConfig = require("../../model/user-config");
const ConfigError = require("../../config-error");
const StringSplitter = require('../../../util/string-splitter');

const path = require('path');
const fs = require('fs');
const xml = require('xml');
const UserPrivilegesConfig = require("../../model/user-privileges-config");
const SchemaPrivilege = require("../../model/priv/schema-privilege");
const TablePrivilege = require("../../model/priv/table-privilege");
const DataNodePrivilege = require("../../model/priv/data-node-privilege");

class XMLServerLoader {

    static #DEFAULT_DTD = 'server.dtd';
    static #DEFAULT_XML = 'server.xml';

    #system = new SystemConfig();
    #users = new Map();
    #firewall = new FirewallConfig();
    #cluster = null;

    constructor(serverFile) {
        let conf = SystemConfig.confPath;
        let dtdFile = path.join(conf, XMLServerLoader.#DEFAULT_DTD);
        if (!serverFile) {
            serverFile = path.join(conf, XMLServerLoader.#DEFAULT_XML);
        }
        let parser = new Parser(this);
        let { cluster } = parser.parse(dtdFile, serverFile);
        this.#cluster = cluster;
    }

    get system() { return this.#system; }

    get users() { return this.#users; }

    get firewall() { return this.#firewall; }

    get cluster() { return this.#cluster; }

}

class Parser {

    #loader;
    #file;

    constructor(loader) {
        this.#loader = loader;
    }

    get file() { return this.#file; }

    parse(dtdFile, serverFile) {
        let root;
        {
            let s = fs.readFile(serverFile, SystemConfig.ENCODING);
            root = xml.parse(s);
            this.#file = serverFile;
        }

        let system = this.#loader.system;
        this.parseSystem(root);
        this.parseUsers(root);
        let cluster = this.parseCluster(root, system.serverPort);
        this.parseFirewall(root);
        return { cluster };
    }

    parseSystem(root) {
        const sysElements = root.getElementsByTagName('system');
        const n = sysElements.length;
        const system = this.#loader.system;

        for (let i = 0; i < n; ++i) {
            let sysElem = sysElements[i];
            let props = XmlHelper.parsePropertyChildren(sysElem);
            ObjectHelper.fill(system, props);
        }
    }

    parseUsers(root) {
        const userElements = root.getElementsByTagName('user');
        const n = userElements.length;
        const users = this.#loader.users;
        const strAttr =  XmlHelper.parseStrAttr;

        for (let i = 0; i < n; ++i) {
            const userElem = userElements[i];
            const name = strAttr('name', userElem);
            if (users.has(name)) {
                throw new ConfigError(`user '${name}' duplicated in ${this.file}`);
            }

            const defAcc = 'true' === strAttr('defaultAccount', userElem, name, 'false');
            const userConf = new UserConfig();
            userConf.name = name;
            userConf.defaultAccount = defAcc;

            const props = XmlHelper.parsePropertyChildren(userElem);
            for (let [key, value] of props) {
                switch (key) {
                    case 'benchmark':
                    case 'defaultSchema':
                    case 'password':
                    case 'readOnly':
                        userConf[key] = value;
                        break;
                    case 'schemas':
                        let a = StringSplitter.split(value, ',');
                        let schemas = new Set();
                        a.forEach(s => schemas.add(s));
                        userConf.schemas = schemas;
                        break;
                    default:
                        throw new ConfigError(`Unknown user property '${key}' in ${this.file}`);
                }
            }
            this.parsePrivileges(userConf, userElem);
            users.set(name, userConf);
        }
    }

    parsePrivileges(userConf, userElem) {
        const privConf = new UserPrivilegesConfig();
        const privElements = userElem.getElementsByTagName('privileges');
        const n = privElements.length;
        // Parse user priv
        for (let i = 0; i < n; ++i) {
            const privElem = privElements[i];
            const check = 'true' === XmlHelper.parseStrAttr('check', 
                privElem, undefined, 'false');
            privConf.check = check;
            // Parse schema priv
            const schElements = privElem.getElementsByTagName('schema');
            let m = schElements.length;
            for (let j = 0; j < m; ++j) {
                const schElem = schElements[j];
                const schName = XmlHelper.parseStrAttr('name', schElem);
                const dml = this.parseDml(schElem, schName);
                const schPriv = new SchemaPrivilege();
                schPriv.name = schName;
                schPriv.dml = dml;

                const tabElements = schElem.getElementsByTagName('table');
                const len = tabElements.length;
                for (let k = 0; k < len; ++k) {
                    const tabElem = tabElements[k];
                    const tabName = XmlHelper.parseStrAttr('name', tabElem);
                    const dml = this.parseDml(tabElem, tabName);
                    const tabPriv = new TablePrivilege();
                    tabPriv.name = tabName;
                    tabPriv.dml = dml;
                    schPriv.addTablePrivilege(tabName, tabPriv);
                }
                privConf.addSchemaPrivilege(schName, schPriv);
            }

            // Parse dataNode priv
            const dnElements = privElem.getElementsByTagName('dataNode');
            m = dnElements.length;
            for (let j = 0; j < m; ++j) {
                const dnElem = dnElements[j];
                const dnName = XmlHelper.parseStrAttr('name', dnElem);
                const dml = this.parseDml(dnElem, dnName);
                const dnPriv = new DataNodePrivilege();
                dnPriv.name = dnName;
                dnPriv.dml = dml;
                privConf.addDataNodePrivilege(dnName, dnPriv);
            }
        }
        userConf.privilegesConfig = privConf;
    }

    parseDml(elem, elName) {
        const tagName = elem.tagName;
        const dml = XmlHelper.parseStrAttr('dml', elem, elName, '0000');
        const n = dml.length;
        if (n !== 4) {
            throw new ConfigError(`dml ${dml} length not 4 in ${tagName} ${elName}`);
        }

        const res = [];
        for (let i = 0; i < n; ++i) {
            let c = dml.charAt(i);
            if (c === '0') res.push(0);
            else if (c === '1') res.push(1);
            else throw new ConfigError(`dml ${dml} format error in ${tagName} ${elName}`);
        }

        return res;
    }

    parseCluster(root, port) {
        // TODO
    }

    parseFirewall(root) {
        // TODO
    }

}

module.exports = XMLServerLoader;
