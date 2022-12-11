const SqlError = require("./sql-error");
const SqlObject = require("./sql-object");

class SqlComment extends SqlObject {

    #multi = false;
    #sign = "";

    constructor(source = "", start = 0, end = 0, sign = "") {
        super(source, start, end);
        if (sign != '--' && sign != '#' && sign != '/*' && sign != '//') {
            throw new SqlError(`Unknown comment sign ${sign}`);
        }
        this.#sign = sign;
        this.#multi = ("/*" == sign);
    }

    get multi() { return this.#multi; }

    get sign() { return this.#sign; }
    
    toString() {
        let s = super.toString();
        switch(this.sign) {
            case '--':
            case '//':
                return this.sign + s;
            case '#':
                return "#"  + s;
            default:
                return "/*" + s + "*/";
        }
    }

}

module.exports = SqlComment;
