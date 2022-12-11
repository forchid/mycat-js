const ErrorCode = require("./mysql/error-code");

class ConnError extends Error {

    errno = ErrorCode.ER_YES;

    constructor(message, errno) {
        super(message);
        this.name = this.constructor.name;
        if (errno !== undefined) {
            this.errno = errno;
        }
    }

}

module.exports = ConnError;
