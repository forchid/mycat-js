const SqlError = require("./sql-error");
const SqlName = require("./sql-name");
const SqlObject = require("./sql-object");

/** 
 * A name that represents SQL objects such as schema, table, column, but 
 * the user variable name is excluded, it may be empty, has the char '.', 
 * or it's length can exceed 256 in mariadb.
 * 
 * @author little-pan
 * @since 2022-11-29
 */
class Identifier extends SqlName {

    constructor (source, name, quoted = false, quotes = "", 
        type = 0, alias = "") {
        super (source, name, quoted, quotes, alias);
        super.type = type;
    }

    get fullName() {
        let name = this.name;
        let p = this.parent;
        while (p) {
            name = p.name + "." + name;
            p = p.parent;
        }

        return name;
    }

    static maxLengthOf(type) {
        switch (type) {
            case SqlObject.TYPE_ID_ALIAS:
                return 256; // Actual 255 in mariadb?
            case SqlObject.TYPE_ID_LABEL:
                return 16;
            case SqlObject.TYPE_ID_USER:
                return 80;
            case SqlObject.TYPE_ID_ROLE:
                return 128;
            default:
                return 64;
        }
    }

    static unquotedChar(c) {
        if (!c || c.constructor !== String || c.length != 1) {
            throw new SqlError(`The arg c ${c} not a char`);
        }
        return (
            c >= 'A' && c <= 'Z' || 
            c >= 'a' && c <= 'z' ||
            c >= '0' && c <= '9' ||
            c == '$' || c == '_' ||
            c >= '\u0080' && c <= '\uFFFF'
        );
    }

}

module.exports = Identifier;
