/**
 * Transaction isolation level definition.
 */
class Isolation {

    static get READ_UNCOMMITTED() { return 1; }

    static get READ_COMMITTED() { return 2; }

    static get REPEATED_READ() { return 3; }

    static get SERIALIZABLE() { return 4; }
}

module.exports = Isolation;
