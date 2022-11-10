class TypeHelper {

    static ensureOf(obj, typeClass, typeName, message) {
        if (!obj instanceof typeClass) {
            message = message !== undefined? message + '': 
                `The object '${obj}' not a ${typeName}`;
            throw new TypeError(message);
        }
    }

    static ensureInt(i, name = '') {
        let n = i;

        if (typeof i !== 'number') {
            n = parseInt(i);
            if (isNaN(n)) throw new TypeError(`${name? name+' ': ''}'${i}' not a number`);
        }
        if (n + '' != i) throw new TypeError(`${name? name+' ': ''}''${i}' not a int`);

        return n;
    }

}

module.exports = TypeHelper;
