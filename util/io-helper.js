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

    static dumpHex(buffer, start = 0, end = -1, indent = '  ', limit = 4096) {
        let s = '';
        let b = buffer;
        
        if (end === -1) {
            end = b.length;
        }
        end = Math.min(end, limit);
        if (start > 0 || end !== b.length) {
            b = b.slice(start, end);
            start = 0; // reset indexes
            end = b.length;
        }
        
        b.forEach((v, i) => {
            if (i % 0x10 === 0) s += indent;
            v &= 0xff;
            if (v < 0x10) s += '0';
            s += v.toString(16).toUpperCase() + ' ';
            // printable chars
            const j = i + 1;
            let r = j % 0x10;
            if (r === 0 || j === end) {
                if (r > 0 && j === end) {
                    // padding
                    for (; r < 0x10; ++r) {
                        s += '   ';
                        if (r === 8) s += ' ';
                    }
                }
                s += ' ';
                i = j - i % 0x10 - 1;
                for (; i < j; ) {
                    v = b[i++] & 0xff;
                    if (v >= 0x20 && v < 0x80) {
                        s += String.fromCodePoint(v);
                    } else {
                        s += '.';
                    }
                }
                if (j !== end) s += '\r\n';
            } else if (r === 8) {
                s += ' ';
            }
        });

        return s;
    }

}

module.exports = IoHelper;
