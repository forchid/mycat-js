const StringHelper = require('../../util/string-helper');
const TypeHelper = require("../../util/type-helper");
const RuleConfig = require("./rule/rule-config");

/**
 * Table sharding rule config.
 * @author little-pan
 * @since 2022-11-18
 */
class TableRuleConfig {

    #name;
    #rule;

    constructor(name, rule) {
        this.name = name;
        TypeHelper.ensureOf(rule, RuleConfig, 'RuleConfig');
        this.#rule = rule;
    }

    get name() {
        return this.#name;
    }

    set name(name) {
        StringHelper.ensureNotBlank(name, 'name');
        this.#name = name;
    }

    get rule() {
        return this.#rule;
    }
}

module.exports = TableRuleConfig;