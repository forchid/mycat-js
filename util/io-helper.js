const StringHelper = require('./string-helper');
const fs = require('fs');
const path = require('path');

class IoHelper {

    static dirEmpty(dir, incFile = true, incDir = true) {
        StringHelper.ensureNotBlank(dir);
        let names = fs.readdir(dir);
        let n = names.length;

        if (incFile && incDir) {
            return n == 0;
        }

        for (let i = 0; i < n; ++i) {
            try {
                let p = path.join(dir, names[i]);
                let stat = fs.stat(p);
                if (stat.isFile()) {
                    if (incFile) return false;
                } else if (stat.isDirectory()) {
                    if (incDir) return false;
                }
            } catch (e) {
                if (e.code != 'ENOENT') throw e;
            }
        }

        return true;
    }

    static hasFile(dir) {
        return !this.dirEmpty(dir, true, false);
    }

    static hasDir(dir) {
        return !this.dirEmpty(dir, false, true);
    }

    static clearDir(dir, recur = false) {
        StringHelper.ensureNotBlank(dir);
        let names = fs.readdir(dir);

        names.forEach(name => {
            let p = path.join(dir, name);
            try {
                if (fs.stat(p).isDirectory()) {
                    if (recur) this.clearDir(p);
                } else {
                    fs.unlink(p);
                }
            } catch (e) {
                if (e.code != 'ENOENT') throw e;
            }
        });
    }

}

module.exports = IoHelper;
