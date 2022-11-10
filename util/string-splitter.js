const TypeHelper = require("./type-helper");

class StringSplitter {

    /** Split src into a string array by these 3 separators fi, se, and th(a range 
     * separator such as '-'). eg. the src 'db$1-3,db$10-11' is splitted into ['db1', 
     * 'db2', 'db3', 'db10', 'db11'].
     */
    static range3(src, fi, se, th, le = '0', ri = '0', trim = true) {     
        const fiRes = this.split(src, fi, trim);
        if (!fiRes) return fiRes;

        const res = [];
        fiRes.forEach(s => {
            let ran = this.range2(s, se, th, le, ri, trim);
            res.push(... ran);
        });

        return res;
    }

    /**
     * Split src into a string array by these 2 separators fi, se(a range 
     * separator such as '-'). eg. the src 'db$1-3' is splitted into ['db1', 
     * 'db2', 'db3'].
     */
    static range2(src, fi, se, le = '0', ri = '0', trim = true) {
        let fiRes = this.split(src, fi, trim);
        if (!fiRes || fiRes.length <= 1) {
            return fiRes;
        }

        const prefix = fiRes[0];
        const next = fiRes[1];
        const rang = this.split(next, se, trim);
        let n = rang.length;
        if (n == 1 && rang[0] == '') {
            // next a empty string
            return [prefix];
        }

        const min = parseInt(rang[0]);
        const max = parseInt(rang[n - 1]); // may be min
        if (isNaN(min) || isNaN(max)) {
            throw new TypeError(`'${ next }' not a number range!`);
        }

        const res = [];
        const itr = i => {
            let it = prefix;
            if (le === '0') {
                it = it + i; 
            } else if (ri === '0') {
                it = it + le + i;
            } else {
                it = it + le + i + ri;
            }
            res.push(it);
        };
        if (min <= max)
            for (let i = min; i <= max; ++i) itr(i);
        else 
            for (let i = min; i >= max; --i) itr(i);

        return res;
    }

    static split(src, sep, trim = true) {
        if (src == null) {
            return null;
        }
        TypeHelper.ensureOf(src, String);

        if (src && trim) {
            src = src.trim();
        }

        const res = [];
        let p = 0;
        let i = src.indexOf(sep);

        while (i != -1) {
            if (i >= p) {
                let it = src.slice(p, i);
                if (trim) it = it.trim();
                res.push(it);
            }
            p = i + 1;
            i = src.indexOf(sep, p);
        }
        let la = src.slice(p);
        if (trim) la = la.trim();
        res.push(la);

        return res;
    }

}

module.exports = StringSplitter;
