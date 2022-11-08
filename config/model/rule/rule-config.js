const StringHelper = require('../../../util/string-helper');
const TypeHelper = require('../../../util/type-helper');
const RuleAlgorithm = require('./rule-algorithm');

/**
 * The sharding rule. It's column as the sharding field 
 * of a physical database.
 * 
 * @author little-pan
 * @since 2022-11-08
 */
class RuleConfig {

    #column;
    #functionName;
    #algorithm = null;

    constructor(column, functionName) {
        StringHelper.ensureNotBlank(column, 'column');
        StringHelper.ensureNotBlank(functionName, 'functionName');
        this.#column = column;
        this.#functionName = functionName;
    }

    get column() { return this.#column; }

    get functionName() { return this.#functionName; }

    get algorithm() { return this.#algorithm; }

    set algorithm(algorithm) {
        TypeHelper.ensureOf(algorithm, RuleAlgorithm, 'RuleAlgorithm');
        this.#algorithm = algorithm;
    }
}

module.exports = RuleConfig;
