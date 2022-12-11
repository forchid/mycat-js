const fs = require('fs');
const path = require('path');
const StringHelper = require('./string-helper');
const TypeHelper = require('./type-helper');

class Properties {

    #props = new Map();

    getProperty(key) {
        return this.#props.get(key);
    }

    setProperty(key, value) {
        this.#props.set(key, value);
    }

    getIntProperty(key, def) {
        let prop = this.getProperty(key);
        if (prop) {
            return TypeHelper.parseIntDecimal(prop);
        } else {
            return def;
        }
    }

    iterate(fun) {
        let props = this.#props;
        for (let [key, val] of props) {
            fun(key, val);
        }
    }

    remove(key) {
        return this.#props.delete(key);
    }

    load(dir, filename, errIfAbsent = false) {
        let p = joinPath(dir, filename);

        try {
            let lines = fs.readLines(p);
            for (let line of lines) {
                line = line.trim();
                if (line.startsWith('#') || line === '') {
                    continue;
                }
                let i = line.indexOf('=');
                if (i === -1) {
                    let e = `A line no separator '=' in ${p}`;
                    throw new Error(e);
                }
                let key = line.slice(0, i);
                let val = line.slice(i + 1);
                this.#props.set(key, val);
            }
        } catch (e) {
            if (e.code != 'ENOENT' || errIfAbsent) throw e;
        }
    }

    save(dir, filename, comment = 'Update') {
        let p = joinPath(dir, filename);
        let t = StringHelper.formatTimestamp(new Date());
        let d = `# ${comment} at ${t}\r\n`;

        for (let [key, value] of this.#props) {
            d += `${key}=${value}\r\n`;
        }
        fs.writeTextFile(p, d);
    }

}

function joinPath(dir, filename) {
    if (filename) {
        return path.join(dir, filename);
    } else {
        return dir;
    }
}

module.exports = Properties;
