const SqlObject = require("../sql-object");

/**
 * A token is the result of lexer analysis.
 * 
 * @author little-pan
 * @since 2022-12-03
 */
class SqlToken extends SqlObject {

    prefix = "";

    constructor (source, start, end, type) {
        super(source, start, end);
        super.type = type;
    }

    /** Token undefined. */
    static get UNDEFINED() { return 0; }

    /** Identifier token, keyword is a special one. */
    static get ID() { return 1; }

    /** Int token. */
    static get INT() { return 2; }

    /** BigInt token. */
    static get BIGINT() { return 3; }

    /** Double token. */
    static get DOUBLE() { return 4; }

    /** String token. */
    static get STRING() { return 5; }

    /** Sign token, eg. ',', ';', '('. */
    static get SIGN() { return 6; }

    /** Blank token, eg. '  ', '\n ', '\r\n'. */
    static get BLANK() { return 7; }

    /** Comment token, eg. '# ..', '// ..' . */
    static get COMMENT() { return 8; }

    /** End of SQL token. */
    static get EOS() { return 9; }

    static get USER_VAR() { return 10; }

    static get OP_ARI() { return 20; }

    static get OP_ASS() { return 30; }

    static get OP_BIT() { return 40; }

    static get OP_CMP() { return 50; }

    static get OP_CMP() { return 60; }

    static get OP_LGC() { return 70; }

}

module.exports = SqlToken;
