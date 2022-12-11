const Isolation = require("../../config/isolation");
const FrontConnection = require("../front-connection");
const ServerSysVariables = require("./server-sys-variables");

class ServerConnection extends FrontConnection {

    #sysVars = ServerSysVariables.createSysVars();

    #txIsolation = Isolation.REPEATED_READ;
    #readonly = false;
    #lastInsertId = 0;

    constructor (id, socket, handler) {
        super(id, socket, handler);
    }

    get sysVars() {
        return this.#sysVars;
    }

    get txIsolation() {
        return this.#txIsolation;
    }

    set txIsolation(level) {
        this.#txIsolation = level;
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
