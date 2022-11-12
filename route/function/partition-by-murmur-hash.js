const RuleAlgorithm = require("../../config/model/rule/rule-algorithm");
const ArgumentError = require("../../lang/argument-error");
const TypeHelper = require("../../util/type-helper");

class PartitionByMurmurHash extends RuleAlgorithm {

    static #DEFAULT_VIRTUAL_BUCKET_TIMES = 160;

    #seed = 0;
    #count = 0;
    #virtualBucketTimes = PartitionByMurmurHash.#DEFAULT_VIRTUAL_BUCKET_TIMES;

    get seed() {
        return this.#seed;
    }

    set seed(seed) {
        this.#seed = TypeHelper.parseIntDecimal(seed, 'seed');
    }

    get count() {
        return this.#count;
    }

    set count(count) {
        this.#count = TypeHelper.parseIntDecimal(count, 'count');
    }

    get virtualBucketTimes() {
        return this.#virtualBucketTimes;
    }

    set virtualBucketTimes(vbTimes) {
        this.#virtualBucketTimes = TypeHelper.parseIntDecimal(vbTimes, 
            'virtualBucketTimes');
    }

    // TODO
}

module.exports = PartitionByMurmurHash;
