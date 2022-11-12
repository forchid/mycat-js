const RuleAlgorithm = require("../../config/model/rule/rule-algorithm");
const TypeHelper = require("../../util/type-helper");

class PartitionByMod extends RuleAlgorithm {

    #count = 0;

    get count() {
        return this.#count;
    }

    set count(count) {
        this.#count = TypeHelper.parseDecimal(count, true, 'count');
    }

    // TODO
}

module.exports = PartitionByMod;
