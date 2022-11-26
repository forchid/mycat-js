const UnsupportedError = require("../lang/unsupported-error");
const MycatServer = require("../mycat-server");
const Logger = require("../util/logger");
const ConfigError = require("./config-error");

/**
 * Mycat privileges query.
 */
class MycatPrivileges {

    static #instance = null;

    constructor () {
        if (MycatPrivileges.#instance) {
            throw new ConfigError('Mycat privileges had been initialized!');
        }
    }

    schemaExists(schema) {
        let schemas = getSchemas();
        return schemas.has(schema);
    }

    userExists(user, host, warnIfAbsent = true) {
        return this.checkWhiteHostPolicy(user, host, warnIfAbsent);
    }

    checkWhiteHostPolicy(user, host, warnIfAbsent = true) {
        let config = getConfig();
        let firewall = config.firewall;
        let passed = false;

        let whiteHosts = firewall.whiteHosts;
        let whiteHostMasks = firewall.whiteHostMasks;
        if (whiteHosts.size === 0 && whiteHostMasks.size === 0) {
            let users = config.users;
            passed = users.has(user);
        } else {
            let users = whiteHosts.get(host);
            if (users) {
                for (let conf of users) {
                    if (conf.name === user) {
                        passed = true;
                        break;
                    }
                }
            }
            if (!passed) {
                for (let [pattern, users] of whiteHostMasks) {
                    if (pattern.test(host)) {
                        for (let conf of users) {
                            if (conf.name === user) {
                                passed = true;
                                break;
                            }
                        }
                    }
                    if (passed) break;
                }
            }
        }

        if (!passed && warnIfAbsent) {
            Logger.warn(`The user \`%s\`@%s try to attack the server!`, user, host);
        }
        return passed;
    }

    getPassword(user) {
        let config = getConfig();
        let system = config.system;

        if (user && user === system.clusterHeartbeatUser) {
            return system.clusterHeartbeatPass;
        } else {
            let users = config.users;
            let conf = users.get(user);
            if (conf.name === user) {
                return conf.password;
            } else {
                return '';
            }
        }
    }

    getUserSchemas(user) {
        let users = getUsers();
        let conf = users.get(user);
        if (conf) return conf.schemas;
        else return new Set();
    }

    readOnly(user) {
        let users = getUsers();
        let conf = users.get(user);
        if (conf) return conf.readOnly;
        else return; // undefined
    }

    getBenchmark(user) {
        let users = getUsers();
        let conf = users.get(user);
        if (conf) return conf.benchmark;
        else return 0;
    }

    checkSQLPolicy(user, sql) {
        throw new UnsupportedError('checkSQLPolicy() not impl!');
    }

    checkSchemaDml(user, schema, sql) {
        throw new UnsupportedError('checkSchemaDml() not impl!');
    }

    checkDataNodeDml(user, dataNode, sql) {
        throw new UnsupportedError('checkDataNodeDml() not impl!');
    }

    static get instance() {
        let priv = this.#instance;
        if (priv) return priv;
        else return this.#instance = new MycatPrivileges();
    }

}

function getConfig() {
    return MycatServer.instance.config;
}

function getSchemas() {
    return getConfig().schemas;
}

function getUsers() {
    return getConfig().users;
}

module.exports = MycatPrivileges;
