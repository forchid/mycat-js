const SystemConfig = require('../../system-config');

const path = require('path');
const fs = require('fs');
const xml = require('xml');
const XmlHelper = require('./xml-helper');
const ConfigError = require('../../config-error');
const StringHelper = require('../../../util/string-helper');
const ObjectHelper = require('../../../util/object-helper');
const RuleAlgorithm = require('../../model/rule/rule-algorithm');
const BeanConfig = require('../../util/bean-config');

/**
 * A loader that parses rule xml.
 * 
 * @author little-pan
 * @since 2022-11-18
 */
class XMLRuleLoader {

    static #DEFAULT_DTD = 'rule.dtd'; // Ignore
	static #DEFAULT_XML = 'rule.xml';

    #tableRules = new Map(); // rule-name -> rule
    #functions = new Map();  // fun-name  -> function

    constructor(ruleFile) {
        if (!ruleFile) {
            let baseDir = SystemConfig.confPath;
            ruleFile = path.resolve(baseDir, XMLRuleLoader.#DEFAULT_XML);
        }
        let parser = new Parser(this);
        parser.parse(XMLRuleLoader.#DEFAULT_DTD, ruleFile, this.#functions);
    }

    get tableRules() { return this.#tableRules; }

}

class Parser {

    #loader;

    constructor(loader) {
        this.#loader = loader;
    }

    parse(dtdFile, ruleFile, functions) {
        let root;
        {
            let s = fs.readFile(ruleFile, SystemConfig.ENCODING);
            root = xml.parse(s);
        }

        this.parseFunctions(root, functions);
    }

    parseFunctions(root, functions) {
        let funcs = root.getElementsByTagName('function');
        let n = funcs.length;

        for (let i = 0; i < n; ++i) {
            const funElem = funcs[i];
            const name = XmlHelper.parseStrAttr('name', funElem, i + 1);

            if (functions.has(name)) {
                throw new ConfigError(`rule function '${name}' duplicated!`);
            }
            
            const className = XmlHelper.parseStrAttr('class', funElem, name);
            const func = this.createFunction(name, className);
            const params = XmlHelper.parsePropertyChildren(funElem);

            BeanConfig.fill(func, params, true);
            func.init();
            functions.set(name, func);
        }
    }

    createFunction(name, className) {
        const func = ObjectHelper.create(className, false);

        if (func instanceof RuleAlgorithm) {
            return func;
        } else {
            throw new ConfigError(`function "${name}" not a RuleAlgorithm`);
        }
    }

}

module.exports = XMLRuleLoader;
