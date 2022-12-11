const UnsupportedError = require("../lang/unsupported-error");
const co = require("coroutine");

class CoHelper {

    constructor() {
        throw new UnsupportedError('CoHelper()');
    }

    static get name() {
        let cur = co.current();
        return cur.name;
    }

    static set name(name) {
        let cur = co.current();
        cur.name = name;
    }

}

CoHelper.name = 'main';
module.exports = CoHelper;
