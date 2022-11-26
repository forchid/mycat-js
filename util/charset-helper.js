const SystemConfig = require("../config/model/system-config");
const Properties = require("./properties");
const TypeHelper = require("./type-helper");

class CharsetHelper {

    static charset(i, mb4 = false) {
        let cs = INDEX_TO_CHARSET.get(i);
        if (!mb4 && cs === 'utf8mb4') cs = 'utf8';
        return (cs || '');
    }

    static index(c) { 
        return (CHARSET_TO_INDEX.get(c) || 0);
    }
}

const INDEX_TO_CHARSET = new Map();
const CHARSET_TO_INDEX = new Map();
// Init
INDEX_TO_CHARSET.set(1, 'big5');
INDEX_TO_CHARSET.set(8, 'latin1');
INDEX_TO_CHARSET.set(9, 'latin2');
INDEX_TO_CHARSET.set(14, 'cp1251');
INDEX_TO_CHARSET.set(28, 'gbk');
INDEX_TO_CHARSET.set(24, 'gb2312');
INDEX_TO_CHARSET.set(33, 'utf8');
INDEX_TO_CHARSET.set(45, 'utf8mb4');
// Extend from 'index_to_charset.properties'
loadFromFile();

for (let [key, val] of INDEX_TO_CHARSET) {
    CHARSET_TO_INDEX.set(val, key);
}
CHARSET_TO_INDEX.set('iso-8859-1', 14);
CHARSET_TO_INDEX.set('iso_8859_1', 14);
CHARSET_TO_INDEX.set('utf-8', 33);

function loadFromFile() {
    let baseDir = SystemConfig.confPath;
    let props = new Properties();
    
    props.load(baseDir, 'index_to_charset.properties');
    props.iterate((key, val) => {
        let i = TypeHelper.parseIntDecimal(key);
        INDEX_TO_CHARSET.set(i, val);
    });
}

module.exports = CharsetHelper;
