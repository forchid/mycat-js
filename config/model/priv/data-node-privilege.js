const StringHelper = require("../../../util/string-helper");
const TypeHelper = require("../../../util/type-helper");
const ConfigError = require("../../config-error");

class DataNodePrivilege {

    #name = '';
    #dml = [ 0, 0, 0, 0 ];

    get name() {
        return this.#name;
    }

    set name(name) {
        this.#name = StringHelper.ensureNotBlank(name, 'dataNode name');
    }

    get dml() {
        return this.#dml;
    }

    set dml(dml) {
        let a = TypeHelper.ensureInstanceof(dml, Array, 'dataNode dml');
        if (a.length === 4) {
            this.#dml = dml;
        } else {
            throw new ConfigError(`dataNode dml length should be 4`);
        }
    }

}

module.exports = DataNodePrivilege;
