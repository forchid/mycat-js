class SqlError extends Error {

    pos  = -1;
    line = 0;

    constructor(message, pos = -1, line = 0) {
        super(message);
        this.name = this.constructor.name;
        this.pos  = pos;
        this.line = line;
    }

}

module.exports = SqlError;
