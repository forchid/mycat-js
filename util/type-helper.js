class TypeHelper {

    static ensureOf(obj, typeClass, typeName, message) {
        if (!obj instanceof typeClass) {
            message = message !== undefined? message + '': 
                `The object '${obj}' not a ${typeName}`;
            throw new TypeError(message);
        }
    }

}

module.exports = TypeHelper;
