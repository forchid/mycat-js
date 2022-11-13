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

    /** Compare the table dataNode count with this algorithm partition num.
     * 
     * @param {*} tableConfig The table config
     * @returns 1 if table dataNode count > algorithm partition num,
     * 0 if table dataNode count = algorithm partition num,
     * -1 if table dataNode count < algorithm partition num.
     */
    suitableFor(tableConfig) {
        const parNum = this.partitionNum;

        if (parNum > 0) {
            const distTable = tableConfig.distTable;
            if (distTable) {
                const distTables = tableConfig.distTables;
                const n = distTables.length;
                if (n < parNum) return -1;
                else if (n > parNum) return 1;
            } else {
                const dnSize = tableConfig.dataNodes.length;
                if (dnSize < parNum) return -1;
                else if (dnSize > parNum) return 1;
            }
        }

        return 0;
    }

}

module.exports = RuleAlgorithm;
