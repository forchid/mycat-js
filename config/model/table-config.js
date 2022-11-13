const TypeHelper = require('../../util/type-helper');
const StringHelper = require('../../util/string-helper');
const StringSplitter = require('../../util/string-splitter');
const ConfigError = require('../config-error');
const RuleConfig = require('../model/rule/rule-config');

/**
 * The table config, there are five types of tables.
 * 1) Global table: a complete copy of the table in all dataNodes.
 * 2) Normal table: some data of the table in a dataNode, some in another dataNode.
 * 3) ER sharding table: the child table partition by it's parent sharding table.
 * 4) Sub-table: all sub-tables only in one dataNode.
 * 5) Default dataNode table: all data in the schema default dataNode, not configured.
 * 
 * @author little-pan
 * @since 2022-11-13
 */
class TableConfig {
    // Class fields
    static #TYPE_GLOBAL_TABLE = 1;
    static #TYPE_GLOBAL_DEFAULT = 0;

    // Instance fields
    #name = '';
    #primaryKey = '';
    #autoIncrement = false;
    #fetchStoreNodeByJdbc = false;
    #needAddLimit = false;
    #dbTypes = new Set();
    #tableType = 0;
    #dataNodes = [];
    #distTables= [];
    #rule = null; // Rule config
    #partitionColumn = '';
    #ruleRequired = false;
    #parent = null; // Parent table config
    #childTable = false;
    #joinKey = ''; // Empty represents no join key
    #parentKey = '';
    #locateRTableKeySql = '';
    // Only has one level of parent
    #secondLevel = false;
    #partitionKeyIsPrimaryKey = false;

    constructor(options) {
        TypeHelper.ensureInstanceof(options, Object, 'options');
        let name = StringHelper.ensureNotBlank(options.tableName, 'tableName');
        this.#name = name.toUpperCase();
        this.#primaryKey = TypeHelper.ensureString(options.primaryKey, 'primaryKey');
        let dataNode = StringHelper.ensureNotBlank(options.dataNode, 'dataNode');
        let dataNodes = StringSplitter.range3(dataNode, ',', '$', '-');
        if (!dataNodes || dataNodes.length == 0) {
            throw new ConfigError(`Invalid table dataNodes: ${dataNode}`);
        }
        this.#dataNodes = dataNodes;
        
        this.#autoIncrement = TypeHelper.ensureBoolean(options.autoIncrement, 'autoIncrement');
        this.#needAddLimit = TypeHelper.ensureBoolean(options.needAddLimit, 'needAddLimit');
        this.#fetchStoreNodeByJdbc = TypeHelper.ensureBoolean(options.fetchStoreNodeByJdbc, 'fetchStoreNodeByJdbc');
        
        this.#tableType = TypeHelper.ensureInteger(options.tableType, 'tableType');
        this.#dbTypes = TypeHelper.ensureInstanceof(options.dbTypes, Set, 'dbTypes');
        this.#ruleRequired = TypeHelper.ensureBoolean(options.ruleRequired, 'ruleRequired');
        let rule = options.rule;
        if (this.ruleRequired && !rule) {
            throw new ConfigError(`ruleRequired but rule not given!`);
        }
        if (rule) {
            TypeHelper.ensureInstanceof(rule, RuleConfig, 'rule');
            this.#partitionColumn = rule.column;
        }
        this.#rule = rule || null;
        this.#partitionKeyIsPrimaryKey = (this.partitionColumn === this.primaryKey);
        
        let subTables = options.subTables;
        if (subTables) {
            let subTabs = StringSplitter.range3(subTables, ',', '$', '-');
            if (!subTabs || subTabs.length === 0) {
                throw new ConfigError(`Invalid table subTables: ${subTables}`);
            }
            this.#distTables = subTabs;
        }
        this.#childTable = TypeHelper.ensureBoolean(options.childTable, 'childTable');

        this.#joinKey = TypeHelper.ensureString(options.joinKey, 'joinKey');
        this.#parentKey = TypeHelper.ensureString(options.parentKey, 'parentKey');
        let parent = options.parent;
        if (parent) {
            TypeHelper.ensureInstanceof(parent, TableConfig, 'table parent');
            this.#parent = parent;
            this.#locateRTableKeySql = this.genLocateRootParentSQL();
            this.#secondLevel = !parent.parent;
        }
    }

    get name() { return this.#name; }

    get dataNodes() { return this.#dataNodes; }

    get primaryKey() { return this.#primaryKey; }

    /** The parent table join key in parent-child ER table */
    get parentKey() { return this.#parentKey; }

    /** The current table join key in parent-child ER table */
    get joinKey() { return this.#joinKey; }
    
    get partitionColumn() { return this.#partitionColumn; }

    get autoIncrement() { return this.#autoIncrement; }

    get needAddLimit() { return this.#needAddLimit; }

    get fetchStoreNodeByJdbc() { return this.#fetchStoreNodeByJdbc; }

    get tableType() { return this.#tableType; }

    get dbTypes() { return this.#dbTypes; }

    get ruleRequired() { return this.#ruleRequired; }

    get rule() { return this.#rule; }

    get partitionKeyIsPrimaryKey() { return this.#partitionKeyIsPrimaryKey; }

    get distTables() { return this.#distTables; }

    get hasDistTables() {
        return (this.distTables.length > 0);
    }

    get childTable() { return this.#childTable; }

    get parent() { return this.#parent; }

    get locateRTableKeySql() { return this.#locateRTableKeySql; }

    get secondLevel() { return this.#secondLevel; }

    /** Find the root table of the ER child table. */
    get rootParent() {
        let cur = this;
        let par = cur.parent;

        if (par) {
             do {
                cur = par;
                par = cur.parent;
            } while (par);
    
            return cur;
        } else {
            return null;
        }
    }

    /**
     * Generate a locating dataNode sql of the root table 
     * by the table joinKey = parentKey, recursive up for 
     * ER sharding table.
     * 
     * @returns A sql for locating dataNode of the root table.
     */
     genLocateRootParentSQL() {
        let tabSql = '';
        let tab = this;
        let par = tab.parent;
        let prev = null;
        let ancestor = '';
        let level = 0;
        let condition = '';
        let latestCond = '';

        while (par) {
            let current = tab.name;
            if (current.indexOf('`') === -1) {
                // TODO: Does other db also need '`'?
                current = '`'+ current +'`';
            }
            ancestor = par.name;
            if (ancestor.indexOf('`') === -1) {
                ancestor = '`'+ ancestor +'`';
            }
            
            tabSql = tabSql + ancestor;
            if (par.parent) tabSql = tabSql + ',';

            const left = ' '+ ancestor +'.'+ tab.parentKey;
            if (level === 0) {
                latestCond = left +' = '; // Right for an execution value
            } else {
                const right = current +'.'+ tab.joinKey;
                const relation = left +' = '+ right;
                condition = condition + relation + ' AND';
            }

            // Next parent
            ++level;
            prev = tab;
            tab = par;
            par = tab.parent;
        }

        if (level < 2) condition = latestCond;
        else condition = condition + latestCond;

        return ('SELECT ' + 
                ancestor+'.'+prev.parentKey +
                ' FROM '+ tabSql +
                ' WHERE '+ condition);
    }

    static get TYPE_GLOBAL_TABLE() { return this.#TYPE_GLOBAL_TABLE; }

    static get TYPE_GLOBAL_DEFAULT() { return this.#TYPE_GLOBAL_DEFAULT; }
}

module.exports = TableConfig;
