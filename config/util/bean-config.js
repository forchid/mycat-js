const ObjectHelper = require("../../util/object-helper");
const StringHelper = require("../../util/string-helper");
const TypeHelper = require("../../util/type-helper");

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
        TypeHelper.ensureInstanceof(params, Map, 'params');
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
        if (bean.init && initEarly) bean.init();
        return bean;
    }

    static fill(bean, params, initEarly = true, errIfAbsent = true) {
        ObjectHelper.fill(bean, params, errIfAbsent, (value) => {
            if (value instanceof BeanConfig) {
                value = value.create(initEarly);
            }
            return value;
        });
    }

}

module.exports = BeanConfig;
