class UnsupportedError extends Error {

    constructor(message) {
        super(message);
        this.name = 'UnsupportedError';
    }

}

module.exports = UnsupportedError;
