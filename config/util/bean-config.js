const ObjectHelper = require("../../util/object-helper");
const StringHelper = require("../../util/string-helper");
const TypeHelper = require("../../util/type-helper");
const ConfigError = require("../config-error");

/**
 * An object config that includes some properties, or 
 * other object information.
 * 
 * @author little-pan
 * @since 2022-11-09
 */
class BeanConfig {

    #name;
    #className;
    #params;

    constructor(name, className, params = new Map()) {
        StringHelper.ensureNotBlank(name, 'name');
        StringHelper.ensureNotBlank(name, 'className');
        TypeHelper.ensureOf(params, Map, "Map");
        this.#name = name;
        this.#className = className;
        this.#params = params;
    }

    get name() { return this.#name; }

    get className() { return this.#className; }

    get params() { return this.#params; }

    create(initEarly = true) {
        const className = this.className;
        const bean = ObjectHelper.create(className, false);

        // Fill properties into this bean
        BeanConfig.fill(this, this.params, initEarly);
        if (bean.init instanceof Function && initEarly) {
            bean.init();
        }

        return bean;
    }

    static fill(bean, params, initEarly = true, errIfAbsent = true) {
        for (let [key, value] of params) {
            if (key in bean) {
                if (value instanceof BeanConfig) {
                    value = value.create(initEarly);
                }
                bean[key] = value;
            } else if (errIfAbsent) {
                let constr = bean.constructor;
                let name;
                if (constr && (name = constr.name))
                    throw new ConfigError(`No property '${key}' in class ${name}`);
                else
                    throw new ConfigError(`No property '${key}' defined`);
            }
        }
    }

}

module.exports = BeanConfig;
