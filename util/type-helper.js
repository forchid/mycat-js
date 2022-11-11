const ArgumentError = require("../lang/argument-error");

class TypeHelper {

    static ensureInstanceof(obj, objClass, name) {
        if (objClass instanceof Function) {
            if (obj instanceof objClass) {
                return; // OK
            }
            let className = objClass.prototype.constructor.name;
            let message = `The ${name || 'object'} ${obj} not a ${className}`;
            throw new TypeError(message);
        } else {
            throw new ArgumentError(`The object class not a constructor`);
        }
    }

    static ensureInteger(i, name) {
        const types = typeof i;

        if (types === 'number' || types === 'bigint' 
            || i instanceof Number) {
            const n = parseInt(i);
            if (i == n && Math.abs(n) <= Number.MAX_SAFE_INTEGER) {
                return; // OK
            }
        }

        name = name? name + '': '';
        if (types === 'string' || i instanceof String) {
            throw new TypeError(`${name}'${i}' not a integer`);
        } else {
            throw new TypeError(`${name}${i} not a integer`);
        }
    }

    static ensureString(s, name) {
        if (typeof s !== 'string' && !(s instanceof String)) {
            name = name? name + ' ': '';
            throw new TypeError(`${name}${s} not a string`);
        }
    }

    static ensureBoolean(b, name) {
        if (typeof b !== 'boolean' && !(b instanceof Boolean)) {
            name = name? name + ' ': '';
            throw new TypeError(`${name}${b} not a boolean`);
        }
    }

    static parseDecimal(i, name, trim = true) {
        const types = typeof i;

        if (types === 'string' || i instanceof String) {
            // String number is required WYSIWYG!
            let s = i;
            if (trim) s = s.trim();
            let m = s.length;
            let j = 0;

            if (m > 0) {
                let c = s.charAt(0);
                if (c === '0' && m > 1) {
                    let p = name? name+' ': '';
                    throw new ArgumentError(`${p}'${i}' can't casted as decimal`);
                }
                if (c === '+' || c === '-') ++j;
            }
            for (;j < m;) {
                let c = s.charAt(j++);
                if (c < '0' || c > '9') {
                    // eg. '1a', '01.1', '0x01a' ...
                    let p = name? name+' ': '';
                    throw new ArgumentError(`${p}'${i}' can't casted as decimal`);
                }
            }
            const n = parseInt(s);
            if (isNaN(n) || (s.startsWith('+') && n !== 0 && s !== '+' + n) 
                || (s.startsWith('-') && n !== 0 && s !== '' + n) 
                || Math.abs(n) > Number.MAX_SAFE_INTEGER) {
                let p = name? name+' ': '';
                throw new ArgumentError(`${p}'${i}' can't casted as decimal`);
            }
            return n; // 1) OK
        }

        if (types === 'number' || i instanceof Number || types === 'bigint') {
            // Literal number, eg. 1, 1e1, 1.0, 1n ...
            const n = parseInt(i);
            if (i == n && Math.abs(n) <= Number.MAX_SAFE_INTEGER) {
                return n; // 2) OK
            }
            // eg. 1.1, NaN
        }
        // eg. undefined, null, true ...
        let p = name? name+' ': '';
        throw new ArgumentError(`${p}${i} can't casted as decimal`);
    }

}

module.exports = TypeHelper;
