const SystemConfig = require('../../system-config');

const path = require('path');

/**
 * A loader that parses xml rules.
 * 
 * @author little-pan
 * @since 2022-11-18
 */
class XMLRuleLoader {

    static #DEFAULT_DTD = 'rule.dtd'; // Ignore
	static #DEFAULT_XML = 'rule.xml';

    #tableRules = new Map();
    #functions = new Map();

    constructor(ruleFile) {
        if (!ruleFile) {
            let baseDir = SystemConfig.confPath;
            ruleFile = path.resolve(baseDir, XMLRuleLoader.#DEFAULT_XML);
        }
        // TODO: load rule
    }

    get tableRules() { return this.#tableRules; }

}

module.exports = XMLRuleLoader;
