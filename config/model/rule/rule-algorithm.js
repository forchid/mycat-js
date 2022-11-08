const UnsupportedError = require('../../../lang/unsupported-error');

class RuleAlgorithm {

    init() {
       
    }

    /**
	 * Calculate the sharding nodes's id.
	 * columnValue is the column's value.
	 * @return A integer, never null
	 */
    calculate(columnValue) {
        throw new UnsupportedError('calculate() not impl');
    }

    /**
     * The routed nodes id sequence.
     * @return nodes id array(all nodes routed if length 0), or
     * no any node is routed if null
     */
    calculateRange(beginValue, endValue) {
        return [];
    }

    /**
     * @return partition count, or not limited if -1
     */
    get partitionNum() {
        return -1;
    }

}

module.exports = RuleAlgorithm;
