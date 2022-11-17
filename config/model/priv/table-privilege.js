const StringHelper = require('../../../util/string-helper');
const TypeHelper = require('../../../util/type-helper');

class TablePrivilege {

    #name = '';
    #dml = [ 0, 0, 0, 0 ];

    get name() {
        return this.#name;
    }

    set name(name) {
        this.#name = StringHelper.ensureNotBlank(name, 'table name');
    }

    get dml() {
        return this.#dml;
    }

    set dml(dml) {
        let a = TypeHelper.ensureInstanceof(dml, Array, 'table dml');
        if (a.length === 4) {
            this.#dml = dml;
        } else {
            throw new ConfigError(`table dml length should be 4`);
        }
    }

    get dmlText() {
        let res = '';
        this.dml.forEach(i => res += i);
        return res;
    }
}

module.exports = TablePrivilege;
