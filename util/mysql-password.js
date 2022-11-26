const UnsupportedError = require("../lang/unsupported-error");
const crypto = require('crypto');

class MysqlPassword {

    constructor() {
        throw new UnsupportedError('MysqlPassword()');
    }

    static scramble411(pass, seed) {
        const algo = 'sha1';
        let md = crypto.createHash(algo);
        let pass1 = md.update(pass).digest();

        md = crypto.createHash(algo);
        let pass2 = md.update(pass1).digest(); // mysql password()
        md = crypto.createHash(algo);
        let pass3 = md.update(seed).update(pass2).digest();

        for (let i = 0; i < pass3.length; ++i) {
            pass3[i] = pass3[i] ^ pass1[i];
        }

        // client sent
        return pass3;
    }

}

module.exports = MysqlPassword;
