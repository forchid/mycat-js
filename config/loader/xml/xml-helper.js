const TypeHelper = require('../../../util/type-helper');
const ConfigError = require('../../config-error');
const BeanConfig = require('../../util/bean-config');

const xml = require('xml');

class XmlHelper {

    static parseStrAttr(name, elem, elName, def) {
        const tag = elem.tagName;
        const attrs = elem.attributes;
        const attr = attrs.getNamedItem(name);

        if (!attr) {
            if (def !== undefined) {
                return def;
            }   
            
            if (elName === undefined) {
                throw new ConfigError(`No ${name} attr in the ${tag}`);
            } else {
                throw new ConfigError(`No ${name} attr in the ${tag} ${elName}`);
            }
        }
        
        const value = attr.value.trim();
        if (value) {
            return value;
        }
        if (def !== undefined) {
            return def;
        }
        
        if (elName === undefined) {
            throw new ConfigError(`${name} attr value blank in the ${tag}`);
        } else {
            throw new ConfigError(`${name} attr value blank in the ${tag} ${elName}`);
        }
    }

    static parseIntAttr(name, elem, elName, def) {
        const tag = elem.tagName;
        const attrs = elem.attributes;
        const attr = attrs.getNamedItem(name);

        let i;
        if ((!attr || (i = attr.value.trim()) == '') && !isNaN(def)) {
            return TypeHelper.parseIntDecimal(def, 'def');
        }

        if (!attr) {
            if (elName === undefined) {
                throw new ConfigError(`No ${name} attr in the ${tag}`);
            } else {
                throw new ConfigError(`No ${name} attr in the ${tag} ${elName}`);
            }
        }
        
        return TypeHelper.parseIntDecimal(i, name);
    }

    static parseChildText(tag, parent, paName, def) {
        const paTag = parent.tagName;
        let children = parent.getElementsByTagName(tag);

        if (children.length == 0) {
            if (def !== undefined) {
                return def;
            } else {
                if (paName === undefined)
                    throw new ConfigError(`No child ${tag} in ${paTag}`);
                else 
                    throw new ConfigError(`No child ${tag} in ${paTag} '${paName}'`);
            } 
        } else {
            return children[0].textContent.trim();
        }
    }

    static parsePropertyChildren(parent) {
        let childNodes = parent.childNodes;
        let n = childNodes.length;
        const params = new Map();
        
        for (let i = 0; i < n; ++i) {
            const node = childNodes[i];
            if (node.nodeType != xml.ELEMENT_NODE
                || node.nodeName != 'property') {
                continue;
            }

            const name = this.parseStrAttr('name', node);
            const beans = node.getElementsByTagName('bean');
            let value;

            if (beans.length == 0) value = node.textContent.trim();
            else value = this.parseBean(beans[0]);
            params.set(name, value);
        }

        return params;
    }

    static getChildElement(parent, tagName) {
        const children = parent.getElementsByTagName(tagName);
        const n = children.length;

        if (n == 1) {
            return children[0];
        } else if (n == 0) {
            return null;
        } else {
            throw new ConfigError(`${tagName} element count over one!`);
        }
    }

    static parseBean(beanElem) {
        const name = this.parseStrAttr('name', beanElem);
        let classElem = this.getChildElement(beanElem, 'className');
        let className;

        if (classElem == null) {
            className = this.parseStrAttr('class', beanElem, name);
        } else {
            className = classElem.textContent.trim();
            if (className == '') {
                throw new ConfigError(`No class in element '${classElem.nodeName}'`);
            }
        }

        const params = this.parsePropertyChildren(beanElem);
        return new BeanConfig(name, className, params);
    }

}

module.exports = XmlHelper;
