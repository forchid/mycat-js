class ConfigError extends Error {

    constructor(message) {
        super(message);
        this.name = 'ConfigError';
    }

}

module.exports = ConfigError;
