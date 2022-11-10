const path = require('path');
const StringHelper = require('./string-helper');

class ObjectHelper {

    /**
     * Load a class by it's class path(relative to BIN directory, this file,  
     * a absolute path, or is MyCat java className).
     */
    static loadClass(classPath) {
        StringHelper.ensureNotBlank(classPath, 'classPath');
        const javaPrefix = 'io.mycat.';
        let realPath = classPath;

        if (realPath.startsWith(javaPrefix)) {
            // Compatible with MyCat-Server java:
            // Java package -> nodejs/fibjs path
            realPath = realPath.slice(javaPrefix.length);
            realPath = StringHelper.mapJavaClassName(realPath);
        }
        if (!realPath.startsWith('.') && !path.isAbsolute(realPath)) {
            // Relative to the BIN directory
            realPath = '../' + realPath; 
        } // else absolute path
        
        try {
            return require(realPath);
        } catch (e) {
            let er = new Error(`Can't load '${realPath}'(class ${classPath}): ${e}`);
            er.cause = e;
            throw er;
        }
    }

    /**
     * Create an object by js class path or java class name.
     */
    static create(classPath, initEarly = true) {
        const Class = this.loadClass(classPath);
        const object = new Class();
        
        if (object.init && initEarly) object.init();
        return object;
    }

    static fill(object, params, errIfAbsent = true, valueFn = null) {
        for (let [key, value] of params) {
            if (key in object) {
                if (valueFn) value = valueFn(value);
                object[key] = value;
            } else if (errIfAbsent) {
                let constr = object.constructor;
                let name;
                if (constr && (name = constr.name)) {
                    throw new TypeError(`No property '${key}' in class ${name}`);
                } else {
                    throw new TypeError(`No property '${key}' in object`);
                }
            }
        }
    }

}

module.exports = ObjectHelper;
