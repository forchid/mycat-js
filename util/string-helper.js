const ArgumentError = require('../lang/argument-error');
const TypeHelper = require('./type-helper');

class StringHelper {

    static ensureNotBlank(str, name) {
        TypeHelper.ensureString(str, name);
        if (str.trim() == '') {
            if (name === undefined)
                throw new ArgumentError(`string is blank`);
            else
                throw new ArgumentError(`${name} is blank`);
        } else {
            return str; // OK
        }
    }

    static mapJavaClassName(className) {
        TypeHelper.ensureString(className, 'className');
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

    static formatDate(d) {
        let y = d.getFullYear();
        let m = d.getMonth() + 1;
        if (m < 10) m = '0' + m;
        let a = d.getDate();
        if (a < 10) a = '0' + a;
        return `${y}-${m}-${a}`;
    }

    static formatTime(d) {
        let h = d.getHours();
        if (h < 10) h = '0' + h;
        let m = d.getMinutes();
        if (m < 10) m = '0' + m;
        let s = d.getSeconds();
        if (s < 10) s = '0' + s;
        return `${h}-${m}-${s}`;
    }

    static formatDateTime(d) {
        let a = StringHelper.formatDate(d);
        let b = StringHelper.formatTime(d);
        return a + ' ' + b;
    }

    static formatTimestamp(d) {
        let a = StringHelper.formatDateTime(d);
        let b = d.getMilliseconds();
        if (b < 10) b = '00' + b;
        else if (b < 100) b = '0' + b;
        return a + '.' + b;
    }

}

module.exports = StringHelper;
