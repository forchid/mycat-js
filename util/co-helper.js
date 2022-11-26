const UnsupportedError = require("../lang/unsupported-error");
const co = require("coroutine");

class CoHelper {

    constructor() {
        throw new UnsupportedError('CoHelper()');
    }

    static name(name) {
        let cur = co.current();
        cur.name = name;
    }

    static name() {
        let cur = co.current();
        return cur.name;
    }

}

CoHelper.name = 'main';
module.exports = CoHelper;
