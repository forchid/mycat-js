const RuleAlgorithm = require("../../config/model/rule/rule-algorithm");

class PartitionByMurmurHash extends RuleAlgorithm {

    static #DEFAULT_VIRTUAL_BUCKET_TIMES = 160;

    seed = 0;
    count = 0;
    virtualBucketTimes = PartitionByMurmurHash.#DEFAULT_VIRTUAL_BUCKET_TIMES;

    // TODO
}

module.exports = PartitionByMurmurHash;
