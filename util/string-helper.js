const ArgumentError = require('../lang/argument-error');
const TypeHelper = require('./type-helper');

class StringHelper {

    static ensureNotBlank(str, name) {
        TypeHelper.ensureOf(str, String);
        if (str.trim() == '') {
            if (name === undefined)
                throw new ArgumentError(`string is blank`);
            else
                throw new ArgumentError(`${name} is blank`);
        }
    }

    static mapJavaClassName(className) {
        TypeHelper.ensureOf(className, String, 'String');
        let jsPath = className.replace(/\./g, '/');
        const i = jsPath.lastIndexOf('/');
        let name = i == -1? className: jsPath.slice(i + 1);
        // Java class -> nodejs/fibjs style filename
        let n = name.length;
        let s = '';
        let f = true; // flag: continuous upper case

        for (let j = 0; j < n; ++j) {
            let c = name.charAt(j);
            if (c >= 'A' && c <= 'Z') {
                c = c.toLowerCase();
                if (!f) c = '-' + c;
                f = true;
            } else {
                f = false;
            }
            s = s + c;
        }

        if (i == -1) return s;
        else return jsPath.slice(0, i + 1) + s;
    }

}

module.exports = StringHelper;
