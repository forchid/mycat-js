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

        name = name? name + ' ': '';
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

    static parseIntDecimal(d, name = '', trim = true) {
        return this.parseDecimal(d, true, name, trim);
    }

    /**
     * Parse decimal(integer or float number), avoid the parseInt() 
     * strange behaviors such as parseInt(0.0000007) returning 7(should be 0), 
     * parseInt('10a') returning 10(should be NaN, or error) etc.
     */
    static parseDecimal(d, onlyInt = false, name = '', trim = true) {
        const types = typeof d;
        const p = name? name+' ': '';

        if (types === 'string' || d instanceof String) {
            // String number is required WYSIWYG!
            // Decimal number format: 
            //1) integer [+-]?([0-9]+)
            //2) float   [+-]?([0-9]+(.[0-9]*)?|[0-9]*.[0-9]+)
            let s = d;
            if (trim) s = s.trim();
            const m = s.length;
            // Step: 1)parseSign, 2)parseIntPart, 3)parseDot, 4)parseFloatPart, 4)over
            let step = 1;
            let c;
            let intPart = false;

            for (let i = 0; step < 5; ++i) {
                if (i >= m) {
                    throw new ArgumentError(`${p}'${d}' can't casted as decimal`);
                }

                c = s.charAt(i);
                switch (step) {
                    case 1:
                        step = 2;
                        // parseSign
                        if (c === '+' || c === '-') continue;
                        // next step
                    case 2:
                        // parseIntPart
                        while (c >= '0' && c <= '9' && i < m) {
                            intPart = true;
                            c = s.charAt(++i);
                        }
                        if (i >= m) {
                            step = 5;
                            continue;
                        } else if (onlyInt) {
                            throw new ArgumentError(`${p}'${d}' can't casted as integer`);
                        }
                        step = 3;
                    case 3:
                        // parseDot
                        if (c === '.') {
                            if (i + 1 >= m) {
                                if (intPart) {
                                    step = 5;
                                    continue;
                                }
                            } else {
                                if (intPart || !onlyInt) {
                                    step = 4;
                                    continue;
                                }
                            }
                        }
                        let er = `${p}'${d}' can't casted as ${onlyInt?'integer':'decimal'}`;
                        throw new ArgumentError(er);
                    case 4:
                        // parseFloatPart
                        while (true) {
                            if (onlyInt) {
                                if (c !== '0') break;
                            } else {
                                if (c < '0' || c > '9') break;
                            }
                            if (i + 1 < m) {
                                c = s.charAt(++i);
                                continue;
                            }
                            step = 5;
                            break;
                        }
                        if (step === 5) {
                            continue;
                        }
                        // fail!
                    default:
                        throw new ArgumentError(`${p}'${d}' can't casted as decimal`);
                }
            }

            if (onlyInt) {
                const n = parseInt(s);
                if (!isNaN(n)) {
                    if (Math.abs(n) <= Number.MAX_SAFE_INTEGER) {
                        return n; // 1-1) OK
                    }
                    throw new ArgumentError(`${p}${d} exceeds max safe integer`);
                }
                throw new ArgumentError(`${p}'${d}' can't casted as integer`);
            } else {
                const n = parseFloat(s);
                if (!isNaN(n)) {
                    return n; // 1-2) OK
                }
                throw new ArgumentError(`${p}'${d}' can't casted as decimal`);
            }
        }

        if (types === 'number' || d instanceof Number || types === 'bigint') {
            if (onlyInt) {
                // Literal number, eg. 1, 1e1, 1.0, 1n ...
                const n = parseInt(d);
                if (n == d) {
                    if (Math.abs(n) <= Number.MAX_SAFE_INTEGER) {
                        return n; // 2-1) OK
                    }
                    throw new ArgumentError(`${p}${d} exceeds max safe integer`);
                }
                // eg. 1.1, NaN
            } else {
                const n = parseFloat(d);
                if (n == d) {
                    // float
                    return n; // 2-2) OK
                }
                // eg. NaN
            }
        }
        // eg. undefined, null, true ...
        throw new ArgumentError(`${p}${d} can't casted as decimal`);
    }

}

module.exports = TypeHelper;
