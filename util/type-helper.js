const ArgumentError = require("../lang/argument-error");

class TypeHelper {

    static ensureOf(obj, objClass, className, message) {
        if (obj === undefined) {
            throw new ArgumentError(`object is undefined`);
        }

        if (objClass instanceof Function) {
            if (obj instanceof objClass) {
                return;
            }

            switch (typeof obj) {
                case 'boolean':
                    if (Boolean === objClass || Object === objClass) {
                        return;
                    }
                    break;
                case 'number':
                    if (Number === objClass || Object === objClass) {
                        return;
                    }
                    break;
                case 'bigint':
                    if (BigInt === objClass || Object === objClass) {
                        return;
                    }
                    break;
                case 'string':
                    if (String === objClass || Object === objClass) {
                        return;
                    }
                    break;
                case 'function':
                    if (Function === objClass || Object === objClass) {
                        return;
                    }
                    break;
                case 'object':
                    if (Object === objClass) {
                        return;
                    }
                    break;
                default:
                    break;
            }
            if (className === undefined) {
                className = objClass.prototype.constructor.name;
            }
            let message = `The object ${obj} not a ${className}`;
            throw new TypeError(message);
        }
        throw new ArgumentError(`The object class not a constructor`);
    }

    static ensureInt(i, name = '') {
        const n = parseInt(i);

        if (n === i) {
            return n;
        }

        if (isNaN(n)) {
            throw new TypeError(`${name? name+' ': ''}'${i}' not a number`);
        }

        const s = n + '';
        if (s === i) {
            return n;
        }

        if (typeof i === 'string') {
            if (i.startsWith('0x') || i.startsWith('0X')) {
                if (i.length - 2 === s.length) return n;
            } else if (i.startsWith('0')) {
                if (i.slice(1) === s) return n;
            }
        }
        throw new TypeError(`${name? name+' ': ''}'${i}' not a int`);
    }

}

module.exports = TypeHelper;
