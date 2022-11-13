const StringHelper = require("../../util/string-helper");
const TypeHelper = require("../../util/type-helper");

/**
 * The table config namespace.
 * 
 * @author little-pan
 * @since 2022-11-12
 */
class SchemaConfig {

    #name = ''; // Default '' only for this property's type hint
    #dataNode = '';
    #tables = new Map();
    #defaultMaxLimit = -1;
    #checkSQLschema = false;
    #randomDataNode = '';

    #defaultDataNodeDbType = '';
    #needSupportMultiDBType = false;

    constructor(name, dataNode, tables, defaultMaxLimit,
        checkSQLschema, randomDataNode) {
        // Check
        StringHelper.ensureNotBlank(name, 'schema name');
        TypeHelper.ensureString(dataNode, 'schema dataNode');
        TypeHelper.ensureInstanceof(tables, Map, 'tables');
        TypeHelper.ensureInteger(defaultMaxLimit, 'defaultMaxLimit');
        TypeHelper.ensureBoolean(checkSQLschema, 'checkSQLschema');
        TypeHelper.ensureString(randomDataNode, 'randomDataNode');

        // Init

    }

    get name() { return this.#name; }

    get dataNode() { return this.#dataNode; }

    /** A map: table name -> table config. */
    get tables() { return this.#tables; }

    get defaultMaxLimit() { return this.#defaultMaxLimit; }

    get checkSQLschema() { return this.#checkSQLschema; }

    get randomDataNode() { return this.#randomDataNode; }

    get defaultDataNodeDbType() { return this.#defaultDataNodeDbType; }

    set defaultDataNodeDbType(defDbType) {
        TypeHelper.ensureString(defDbType, 'defaultDataNodeDbType');
        this.#defaultDataNodeDbType = defDbType;
    }

    get needSupportMultiDBType() { return this.#needSupportMultiDBType; }

    set needSupportMultiDBType(multiDbType) {
        TypeHelper.ensureBoolean(multiDbType, 'needSupportMultiDBType');
        this.#needSupportMultiDBType = multiDbType;
    }
    
}

module.exports = SchemaConfig;
