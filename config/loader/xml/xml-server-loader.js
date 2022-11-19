const SystemConfig = require("../../model/system-config");
const FirewallConfig = require("../../model/firewall-config");
const XmlHelper = require("./xml-helper");
const ObjectHelper = require("../../../util/object-helper");
const UserConfig = require("../../model/user-config");
const ConfigError = require("../../config-error");
const StringSplitter = require('../../../util/string-splitter');
const UserPrivilegesConfig = require("../../model/user-privileges-config");
const SchemaPrivilege = require("../../model/priv/schema-privilege");
const TablePrivilege = require("../../model/priv/table-privilege");
const DataNodePrivilege = require("../../model/priv/data-node-privilege");
const TypeHelper = require("../../../util/type-helper");
const ClusterNodeConfig = require("../../model/cluster-node-config");
const ClusterConfig = require("../../model/cluster-config");

const path = require('path');
const fs = require('fs');
const xml = require('xml');

class XMLServerLoader {

    static #DEFAULT_DTD = 'server.dtd';
    static #DEFAULT_XML = 'server.xml';

    #system = new SystemConfig();
    #users = new Map();
    #firewall = new FirewallConfig();
    #cluster = new ClusterConfig(new Map(), new Map());

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
        const nodes = new Map();
        const groups = new Map();
        // xml structure:
        // server
        //    |- node(name)*
        //    |    | - property(host | weight)
        //    |- group(name)*
        //    |    | - property(nodeList): node list ref node names
        const nodeElements = root.getElementsByTagName('node');
        const n = nodeElements.length;
        const hosts = new Set();

        // Parse node*
        for (let i = 0; i < n; ++i) {
            const nodeElem = nodeElements[i];
            const name = XmlHelper.parseStrAttr('name', nodeElem);
            if (nodes.has(name)) {
                throw new ConfigError(`node name '${name}' duplicated in ${this.file}`);
            }
            const props = XmlHelper.parsePropertyChildren(nodeElem, this.file);
            if (props.size !== 2) {
                let er = `node '${name}' needs host and weight property children in ${this.file}`;
                throw new ConfigError(er);
            }
            let host = null, weight = 0;
            for (let [key, value] of props) {
                switch (key) {
                    case 'host':
                        host = value;
                        break;
                    case 'weight':
                        weight = TypeHelper.parseIntDecimal(value, 'node weight');
                        break;
                    default:
                        let er = `Unknown node '${name}' property '${key}' in ${this.file}`;
                        throw new ConfigError(er);
                }
            }
            if (host) {
                if (hosts.has(host)) {
                    let er = `The property host '${host}' of node '${name}' duplicated in ${this.file}`;
                    throw new ConfigError(er); 
                }
            } else {
                let er = `The property host of node '${name}' is blank in ${this.file}`;
                throw new ConfigError(er);
            }
            if (weight < 1) {
                let er = `The property weight ${weight} of node '${name}' less than 1 in ${this.file}`;
                throw new ConfigError(er);
            }

            const conf = new ClusterNodeConfig(name, host, port, weight);
            nodes.set(name, conf);
            hosts.add(host);
        }

        // Parse group
        const groupElements = root.getElementsByTagName('group');
        const m = groupElements.length;
        for (let i = 0; i < m; ++i) {
            const groupElem = groupElements[i];
            const name = XmlHelper.parseStrAttr('name', groupElem);
            const props = XmlHelper.parsePropertyChildren(groupElem);
            if (props.size !== 1) {
                let er = `group '${name}' needs one property named 'nodeList' in ${this.file}`;
                throw new ConfigError(er);
            }
            let nodeList = props.get('nodeList');
            if (!nodeList) {
                let er = `The property named 'nodeList' of group '${name}' is empty in ${this.file}`;
                throw new ConfigError(er);
            }
            nodeList = StringSplitter.split(nodeList, ',');
            nodeList.forEach(node => {
                if (!nodes.has(node)) {
                    let er = `The node '${node}' of group '${name}' not existing in ${this.file}`;
                    throw new ConfigError(er);
                }
            });
            groups.set(name, nodeList);
        }

        if (!groups.has('default')) {
            const a = [];
            for (let node of nodes.keys()) {
                a.push(node);
            }
            groups.set('default', a);
        }

        return new ClusterConfig(nodes, groups);
    }

    parseFirewall(root) {
        const firewall = this.#loader.firewall;
        const userConfigs = this.#loader.users;
        const whiteHosts = new Map();
        const whiteHostMasks = new Map();
        const hostElements = root.getElementsByTagName('host');
        const n = hostElements.length;
        // Parse host
        for (let i = 0; i < n; ++i) {
            const hostElem = hostElements[i];
            const host = XmlHelper.parseStrAttr('host', hostElem);
            if (host === '') {
                throw new ConfigError(`host attr value blank in ${this.file}`);
            }
            const hosts = StringSplitter.split(host, ',');
            
            const user = XmlHelper.parseStrAttr('user', hostElem);
            if (user === '') {
                throw new ConfigError(`host user attr value blank in ${this.file}`);
            }
            const users = StringSplitter.split(user, ',');

            const ucConfigs = [];
            users.forEach( user => {
                const conf = userConfigs.get(user);
                if (conf) {
                    ucConfigs.push(conf);
                } else {
                    throw new ConfigError(`host user '${user}' not found in ${this.file}`);
                }
            });

            hosts.forEach(host => {
                if (host.indexOf('*') != -1 || host.indexOf('%') != -1) {
                    let p = FirewallConfig.createHostMaskPattern(host);
                    whiteHostMasks.set(p, ucConfigs);
                } else {
                    whiteHosts.set(host, ucConfigs);
                }
            });
        }
        firewall.whiteHosts = whiteHosts;
        firewall.whiteHostMasks = whiteHostMasks;

        // Parse blacklist
        const blElements = root.getElementsByTagName('blacklist');
        const m = blElements.length;
        for (let i = 0; i < m; ++i) {
            const blElem = blElements[i];
            const check = 'true' === XmlHelper.parseStrAttr('check', 
                blElem, undefined, 'false');
            firewall.check = check;
            // TODO WallConfig
            const propElements = blElem.getElementsByTagName('property');
            if (propElements.length > 0) {
                throw new ConfigError(`blacklist property not supported in ${this.file}`);
            }
        }
        firewall.init();
    }

}

module.exports = XMLServerLoader;
