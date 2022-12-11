const StringHelper = require("../../util/string-helper");
const TypeHelper = require("../../util/type-helper");
const ConfigError = require("../config-error");

const crypto = require("crypto");

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
    #noSharding = false;
    /** Key is join relation, A.ID=B.PARENT_ID, value is root table.
     * If a->b*->c*, then A is root table.
	 */
	#joinRel2TableMap = new Map();
    #metaDataNodes = new Set();
    #allDataNodes = new Set();
    #allNodeList = [];
    #dataNodeDbTypes = new Map();

    constructor(name, dataNode, tables, defaultMaxLimit,
        checkSQLschema, randomDataNode) {
        // Check
        this.#name = StringHelper.ensureNotBlank(name, 'schema name');
        this.#dataNode = TypeHelper.ensureString(dataNode, 'schema dataNode');
        this.#tables = TypeHelper.ensureInstanceof(tables, Map, 'tables');
        this.#defaultMaxLimit = TypeHelper.ensureInteger(defaultMaxLimit, 'defaultMaxLimit');
        this.#checkSQLschema = TypeHelper.ensureBoolean(checkSQLschema, 'checkSQLschema');
        this.#randomDataNode = TypeHelper.ensureString(randomDataNode, 'randomDataNode');

        // Init
        buildJoinMap(this);
        this.#noSharding = (!tables || tables.size === 0);
        if (this.#noSharding && !dataNode) {
            throw new ConfigError(`No sharding schema '${name}' must have default dataNode`);
        }
        buildMetaDataNodes(this);
        buildAllDataNodes(this);
        for (let dn of this.#allDataNodes) {
            this.#allNodeList.push(dn);
        }
    }

    get name() { return this.#name; }

    /** The default data node. */
    get dataNode() { return this.#dataNode; }

    /** A map: table name -> table config. */
    get tables() { return this.#tables; }

    get defaultMaxLimit() { return this.#defaultMaxLimit; }

    get checkSQLschema() { return this.#checkSQLschema; }

    get randomDataNode() {
        let randNode = this.#randomDataNode;
        if (randNode) {
            return randNode;
        } else {
            let nodes = this.#allNodeList;
            let n = nodes.length;
            if (n === 0) return null;
            let buf = crypto.randomBytes(4);
            let i = buf.readInt32LE() % n;
            return nodes[i];
        }
    }

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
    
    get noSharding() {
        return this.#noSharding;
    }

    get joinRel2TableMap() {
        return this.#joinRel2TableMap;
    }

    get metaDataNodes() {
        return this.#metaDataNodes;
    }

    get allDataNodes() {
        return this.#allDataNodes;
    }

    get dataNodeDbTypes() {
        return this.#dataNodeDbTypes;
    }

    set dataNodeDbTypes(dbTypes) {
        TypeHelper.ensureInstanceof(dbTypes, Map, 'dataNodeDbTypes');
        this.#dataNodeDbTypes = dbTypes;
    }
}

function buildJoinMap(config) {
    let tables = config.tables;
    if (tables && tables.size > 0) {
        let joinMap = config.joinRel2TableMap;
        for (let tab of tables.values()) {
            if (tab.childTable) {
                let root = tab.rootParent;
                let parent = tab.parent;
                let left = tab.name+'.'+tab.joinKey+'='+
                    parent.name+'.'+tab.parentKey;
                let right= parent.name+'.'+tab.parentKey+'='+
                    tab.name+'.'+tab.joinKey;
                joinMap.set(left, root);
                joinMap.set(right, root);
            }
        }
    }
}

function buildMetaDataNodes(config) {
    let metaNodes = config.metaDataNodes;
    let dataNode = config.dataNode;

    if (!dataNode) metaNodes.add(dataNode);

    if (!config.noSharding) {
        let tabs = config.tables;
        for (let tab of tabs.values()) {
            let dn = tab.dataNodes[0];
            metaNodes.add(dn);
        }
    }
}

function buildAllDataNodes(config) {
    let allNodes = config.allDataNodes;
    let dataNode = config.dataNode;

    if (!dataNode) allNodes.add(dataNode);

    if (!config.noSharding) {
        let tabs = config.tables;
        for (let tab of tabs.values()) {
            for (let dn of tab.dataNodes) {
                allNodes.add(dn);
            }
        }
    }
}

module.exports = SchemaConfig;
