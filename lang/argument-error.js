class ArgumentError extends Error {

    constructor(message) {
        super(message);
        this.name = 'ArgumentError';
    }

}

module.exports = ArgumentError;
