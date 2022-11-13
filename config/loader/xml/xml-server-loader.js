const SystemConfig = require("../../model/system-config");
const FirewallConfig = require("../../model/firewall-config");
const path = require('path');
const fs = require('fs');
const xml = require('xml');

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
        // TODO
    }

    parseUsers(root) {
        // TODO
    }

    parseCluster(root, port) {
        // TODO
    }

    parseFirewall(root) {
        // TODO
    }

}

module.exports = XMLServerLoader;
