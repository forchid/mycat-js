const ArgumentError = require('../lang/argument-error');
const TypeHelper = require('./type-helper');

class StringHelper {

    static ensureNotBlank(str, name) {
        TypeHelper.ensureOf(str, String, 'String');
        if (str.trim() == '') {
            throw new ArgumentError(`${name} is blank`);
        }
    }

}

module.exports = StringHelper;
