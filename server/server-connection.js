const Isolation = require("../config/isolation");
const FrontConnection = require("../net/front-connection");

class ServerConnection extends FrontConnection {

    #txIsolation = Isolation.REPEATED_READ;
    #autoCommit = true;
    #readonly = false;
    #lastInsertId = 0;

    constructor (id, socket, handler) {
        super(id, socket, handler);
    }

    get txIsolation() {
        return this.#txIsolation;
    }

    set txIsolation(level) {
        this.#txIsolation = level;
    }

    get autoCommit() {
        return this.#autoCommit;
    }

    set autoCommit(autoCommit) {
        this.#autoCommit = autoCommit;
    }

    get readonly() {
        return this.#readonly;
    }

    set readonly(readonly) {
        this.#readonly = readonly;
    }

    get lastInsertId() {
        return this.#lastInsertId;
    }

    set lastInsertId(lastInsertId) {
        this.#lastInsertId = lastInsertId;
    }

}

module.exports = ServerConnection;
