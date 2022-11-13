const SystemConfig = require('../../model/system-config');
const XmlHelper = require('./xml-helper');
const ConfigError = require('../../config-error');
const ObjectHelper = require('../../../util/object-helper');
const RuleAlgorithm = require('../../model/rule/rule-algorithm');
const BeanConfig = require('../../util/bean-config');
const TableRuleConfig = require('../../model/table-rule-config');
const StringSplitter = require('../../../util/string-splitter');

const path = require('path');
const fs = require('fs');
const xml = require('xml');
const RuleConfig = require('../../model/rule/rule-config');

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
    #functions = new Map();  // func-name -> func

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
        this.parseTableRules(root, functions);
    }

    parseTableRules(root, functions) {
        // XML basic structure:
        // root
        //  |- tableRule(name)*
        //  |    | - rule
        //  |         | -columns
        //  |         | -algorithm
        const trElements = root.getElementsByTagName('tableRule');
        const n = trElements.length;
        const tableRules = this.#loader.tableRules;

        for (let i = 0; i < n; ++i) {
            const trElem = trElements[i];
            const name = XmlHelper.parseStrAttr('name', trElem, i + 1);

            if (tableRules.has(name)) {
                throw new ConfigError(`table rule '${name}' duplicated!`);
            }
            
            const ruElements = trElem.getElementsByTagName('rule');
            if (ruElements.length == 0) {
                throw new ConfigError(`No rule element in tableRule '${name}'`);
            } else if (ruElements.length > 1) {
                throw new ConfigError(`Only one rule can defined in tableRule '${name}'`);
            }

            const rule = this.parseRule(ruElements[0]);
            const funcName = rule.functionName;
            const func = functions.get(funcName);
            if (!func) {
                let er = `Can't find function '${funcName}' that referenced in tableRule '${name}'`;
                throw new ConfigError(er);
            }
            rule.algorithm = func;
            tableRules.set(name, new TableRuleConfig(name, rule));
        }
    }

    parseRule(ruElem) {
        const colElem = XmlHelper.getChildElement(ruElem, 'columns');
        const column = colElem.textContent.trim();
        const columns = StringSplitter.split(column, ',');

        if (columns.length > 1) {
            throw new ConfigError(`table rule columns has multi values '${column}'`);
        }
        const algoElem = XmlHelper.getChildElement(ruElem, 'algorithm');
        const algoName = algoElem.textContent.trim();

        return new RuleConfig(column.toUpperCase(), algoName);
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
