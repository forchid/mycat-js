const SqlContext = require("../sql-context");
const SqlError = require("../sql-error");
const SqlToken = require("./sql-token");

const MSI_STR = Number.MAX_SAFE_INTEGER + "";

class SqlLexer {

    // sql state
    ctx = new SqlContext();
    sql = '';
    curr = 0;
    line = 1;

    // token state
    #type = 0;
    quotes = '';
    prefix = '';
    start = 0;
    end = 0;

    reset(sql, ctx) {
        if (ctx) this.ctx = ctx;
        this.sql = sql;
        this.curr = 0;
        this.line = 1;
        return this.resetToken();
    }

    get type() {
        return this.#type;
    }

    get quoted() {
        return (!!this.quotes);
    }

    get eos() {
        return (this.curr >= this.sql.length);
    }

    resetToken() {
        this.#type = 0;
        this.quotes = '';
        this.prefix = '';
        this.start = 0;
        this.end = 0;
        return this;
    }

    /** Query the current token if not reset, otherwise the next token.
     * 
     * @param checkEos whether check end of sql, default true
     * @param skipBc whether skip blank or comment, default true
     * @param userVar whether parse user var, default false
     * 
     * @returns the token type
     */
    token(checkEos = true, skipBc = true, userVar = false) {
        let type = this.type;

        if (!type) {
            type = this.nexToken(checkEos, userVar);
        }
        if (skipBc) {
            for (; type == SqlToken.BLANK 
                || type == SqlToken.COMMENT; ) {
                type = this.nexToken(checkEos, userVar);
            }
        }

        return type;
    }

    /** Query the token slice.
     * 
     * @param uc whether upper case, default true
     * @returns the token slice
     * @throws SqlError if the token reset
     */
    slice(uc = true) {
        if (this.type) {
            let s = this.sql.slice(this.start, this.end);
            if (uc) return s.toUpperCase();
            else return s;
        } else {
            throw new SqlError('Lexer token not parse yet');
        }
    }

    /** Parse the next token.
     * 
     * @param checkEos whether check end of sql, default true
     * @param userVar whether parse user var, default false
     * @returns the next token type
     */
    nexToken(checkEos = true, userVar = false) {
        const sql = this.sql;
        const e = sql.length;
        const p = this.curr;

        this.resetToken();
        if (userVar) {
            // Special case: can include '.', number, empty, or `..` etc
            return this.#type = parseUserVar(this, p);
        }

        if (checkEos && p >= e) {
            this.start = this.end = e;
            return this.#type = SqlToken.EOS;
        }

        let i = p;
        let c = this.charAt(i++);
        switch (c) {
            // Comment or arith operator
            case '-':
                c = this.charAt(i++);
                if (c != '-') {
                    this.prefix = '-';
                    this.start = p;
                    this.end = this.curr = p + 1;
                    return this.#type = SqlToken.OP_ARI;
                }
                this.prefix = "--";
            case '#':
                return this.#type = lineComment(this, c, i);
            case '/':
                c = this.charAt(i++);
                if (c != '/' && c != '*') {
                    this.prefix = '/';
                    this.start = p;
                    this.end = this.curr = p + 1;
                    return this.#type = SqlToken.OP_ARI;
                } else if (c == '/') {
                    this.prefix = "//";
                    return this.#type = lineComment(this, c, i);
                } else {
                    this.prefix = "/*";
                    return this.#type = multiComment(this, c, i);
                }
            // Blank token
            case ' ':
            case '\n':
            case '\r':
            case '\t':
            case '\f':
            case '\v':
                return this.#type = blankToken(this, c, i);
            // Quoted ID
            case '`':
                return this.#type = quotedId(this, c, i);
            case '[':
                if (c == this.ctx.quotes) {
                    return this.#type = quotedId(this, c, i);
                } else {
                    this.prefix = c;
                    this.start = p;
                    this.end = this.curr = i;
                    return this.#type = SqlToken.SIGN;
                }
            case '"':
                if (c == this.ctx.quotes) {
                    return this.#type = quotedId(this, c, i);
                }
            // String token
            case '\'':
                return this.#type = strToken(this, c, i);
            case '+':
            case '*':
            case '%':
                this.prefix = c;
                this.start = p;
                this.end = this.curr = i;
                return this.#type = SqlToken.OP_ARI;
            case '>':
            case '<':
            case '=':
            case '!':
            case ':':
            case ',':
            case ';':
            case '(':
            case ')':
            case ']':
            case '@':
            case '?':
            case '|':
            case '^':
            case '&':
            case '~':
                this.prefix = c;
                this.start = p;
                this.end = this.curr = i;
                return this.#type = SqlToken.SIGN;
            default:
                return this.#type = parseToken(this, c, i);
        }
    }

    skipBlankComment() {
        let skipped = false;
        for (;;) {
            let type = this.nexToken(true);
            if (type == SqlToken.BLANK || 
                type == SqlToken.COMMENT) {
                skipped = true;
                continue;
            }
            return skipped;
        }
    }

    charAt(i) {
        let sql = this.sql;
        if (i === undefined) {
            i = this.curr;
        }

        if (i >= sql.length) {
            throw new SqlError("Unexpected end of SQL");
        } else {
            return sql.charAt(i);
        }
    }

    skip(i = 1) {
        this.curr += i;
        return this;
    }

    isBlank(c) {
        return (c == ' '  || c == '\n' || c == '\r' || 
                c == '\t' || c == '\v' || c == '\f');
    }

    getError(i, extra = '') {
        if (i === undefined) i = this.start;
        const s = this.sql;
        let e = s.length;
        let n = this.ctx.errMaxLen;
        if (e - i > n) e = i + n;
        let m = s.slice(i, e);
        m = `SQL syntax error near '${m}' at line ${this.line}${extra}`;
        return new SqlError(m, i, this.line);
    }

}

function blankToken(lexer, c, i) {
    const sql = lexer.sql;
    const e = sql.length;
    const p = i;

    lexer.prefix = c;
    while (i < e) {
        c = sql.charAt(i++);
        if (c == '\n') {
            lexer.line++;
        } else if (c != ' ' && 
            c != '\r' && c != '\t' && 
            c != '\f' && c != '\v') {
            i--;
            break;
        }
    }
    lexer.start = p - 1;
    lexer.end = lexer.curr = i;

    return SqlToken.BLANK;
}

function lineComment(lexer, c, i) {
    const sql = lexer.sql;
    const e = sql.length;
    const p = i;
    let b = '';

    for (; i < e; ) {
        b = c;
        c = sql.charAt(i++);
        if (c == '\n') {
            lexer.line++;
            break;
        }
    }
    lexer.prefix = lexer.prefix || "#";
    lexer.start = p;
    lexer.end = (b == '\r'? i - 2: i - 1);
    lexer.curr = i;

    return SqlToken.COMMENT;
}

function multiComment(lexer, c, i) {
    const sql = lexer.sql;
    const e = sql.length;
    const p = i;
    let b = '';

    for (; i < e; ) {
        c = sql.charAt(i++);
        if (c == '*' && i < e) {
            b = c;
            c = sql.charAt(i++);
            if (c == '/') break;
        } else if (c == '\n') {
            lexer.line++;
        }
    }
    lexer.start = p;
    lexer.end = (b == '*' && c == '/'? i - 2: i);
    lexer.curr = i;

    return SqlToken.COMMENT;
}

function quotedId(lexer, c, i) {
    const quotes = (c == SqlContext.MSSQL_QUOTES? ']': c);
    const e = lexer.sql.length;
    lexer.quotes = c;
    lexer.prefix = c;
    lexer.start = i;

    c = lexer.charAt(i++);
    for (;;) {
        if (c == quotes) {
            if (i < e) {
                c = lexer.charAt(i++);
                if (c != quotes) {
                    i--;
                    break;
                }
                // e.g `..``..`
            } else {
                break;
            }
        }

        if (c == '\n') {
            lexer.line++;
        } else if (c == '\0') {
            throw lexer.getError(--i);
        }

        c = lexer.charAt(i++);
    }
    lexer.end = i - 1;
    lexer.curr = i;

    return SqlToken.ID;
}

function strToken(lexer, c, i) {
    const sql = lexer.sql;
    const e = sql.length;
    const p = i;
    const q = lexer.prefix = c;
    c = lexer.charAt(i++);

    for (;;) {
        if (c == q) {
            if (i < e) {
                c = sql.charAt(i++);
                if (c != q) {
                    i--;
                    break;
                }
                // eg. '..''..'
            } else {
                break;
            }
        } else if (c == '\n') {
            lexer.line++;
        }
        c = lexer.charAt(i++)
    }
    lexer.start = p;
    lexer.end = i - 1;
    lexer.curr = i;

    return SqlToken.STRING;    
}

/** Parse user variable, refs https://mariadb.com/kb/en/user-defined-variables */
function parseUserVar(lexer, i) {
    // [0-9a-zA-Z$_.], '\u0080' ~ '\uffff', or `..`, '..', ".."
    const sql = lexer.sql;
    const e = sql.length;
    const p = i;
    let c;

    lexer.start = p;
    if (i < e) {
        c = sql.charAt(i++);
        lexer.prefix = c;
        if (c == '`' || c == '\'' || c == '"') {
            let quotes = lexer.quotes = c;
            lexer.start = i;
            for (;;) {
                c = lexer.charAt(i++);
                if (c == quotes) {
                    if (i < e) {
                        c = lexer.charAt(i++);
                        if (c == quotes) {
                            // eg. `..``..`
                            continue;
                        } else {
                            --i;
                            break;
                        }
                    } else {
                        break;
                    }
                }
            }
            lexer.curr = i;
            lexer.end = i - 1;
        } else {
            for (;;) {
                if (c >= '0' && c <= '9' || c >= 'a' && c <= 'z' || 
                    c >= 'A' && c <= 'Z' || c == '$' || c == '_' || 
                    c == '.' || c >= '\u0080' && c <= '\uffff') {
                    if (i < e) {
                        c = sql.charAt(i++);
                        continue;
                    } else {
                        break;
                    }
                }
                --i;
                break;
            }
            lexer.end = lexer.curr = i;
        }
    } else {
        // Empty var
        lexer.end = lexer.curr = i;
    }

    return SqlToken.USER_VAR;
}

function parseToken(lexer, c, i) {
    const sql = lexer.sql;
    const e = sql.length;
    const p = i - 1;
    lexer.prefix = c;
    lexer.start = p;
    // '.', number or identifier(unquoted)
    // 1). number
    // integer format: 
    //  [0-9]+, BigInt if great than Number.MAX_SAFE_INTEGER
    // double  format: 
    //  1. [0-9]+.[0-9]*; 2. [0-9]+[eE][+-]?[0-9]+; 3. [0-9]+.[0-9]*[eE][+-]?[0-9]+;
    //  3. [0-9]*.[0-9]+; 5. [0-9]*.[0-9]+[eE][+-]?[0-9]+
    // prefix:
    //  [0-9] or '.'
    //
    // 2). identifier
    //  [0-9a-zA-Z$_], or '\u0080' ~ '\uffff'
    let isn = false, di = -1, zi = p - 1;
    if (c == '.') {
        c = lexer.charAt(i++);
        if (c < '0' || c > '9') {
            lexer.end = lexer.curr = i - 1;
            return SqlToken.SIGN;
        }
        isn = true; // possible
        di = p;
    }
    let ei = -1, si = -1;
    for (;;) {
        if (c >= '0' && c <= '9') {
            if (!isn && i == p + 1) {
                isn = true;
            }
            if (c == '0' && zi == i - 2) {
                zi = i - 1;
            }
        } else if (c == '.') {
            if (di == -1) {
                if (isn || i == p + 1) {
                    di = i - 1;
                } else {
                    i--;
                    break;
                }
            } else {
                throw lexer.getError(--i);
            }
        } else if (c >= 'a' && c <= 'z' ||
                c >= 'A' && c <= 'Z' ||
                c == '$' || c == '_' ||
                c >= '\u0080' && c <= '\uffff') {
            if (c == 'e' || c == 'E') {
                if (isn && ei == -1) {
                    ei = i - 1;
                } else {
                    isn = false;
                }
            } else {
                isn = false;
            }
            if (!isn && di != -1) {
                if (di == p + 1) {
                    lexer.end = lexer.curr = i - 1;
                    return SqlToken.SIGN;
                } else {
                    throw lexer.getError(--i);
                }
            }
        } else if (c == '+' || c == '-') {
            if (ei != -1 && ei == i - 2) {
                si = i - 1;
            } else {
                i--;
                break;
            }
        } else {
            i--;
            break;
        }

        if (i < e) c = sql.charAt(i++);
        else break;
    }
    lexer.end = lexer.curr = i;

    // Num
    if (isn) {
        if (di != -1 && ei != -1) {
            if (di > ei) {
                throw lexer.getError(di);
            }
        }
        if (ei == i - 1) {
            isn = false;
        } else if (si != -1 && si == i - 1) {
            throw lexer.getError(si);
        } else {
            if (di != -1 || ei != -1) {
                return SqlToken.DOUBLE;
            } else {
                let n = lexer.end - zi;
                let m = MSI_STR.length;
                if (n > m) {
                    return SqlToken.BIGINT;
                } else if (n < m) {
                    return SqlToken.INT;
                } else {
                    let s = sql.slice(lexer.start, lexer.end);
                    if (s > MSI_STR) return SqlToken.BIGINT;
                    else return SqlToken.INT;
                }
            }
        }
    }

    // ID
    return SqlToken.ID;
}

module.exports = SqlLexer;
