const MycatPrivileges = require("../config/mycat-privileges");
const MycatServer = require("../mycat-server");
const FrontAuthHandler = require("../net/factory/front-auth-handler");
const FrontConnFactory = require("../net/factory/front-conn-factory");
const FrontReadHandler = require("../net/handler/front-read-handler");
const CoHelper = require("../util/co-helper");
const ServerConnection = require("./server-connection");

class ServerConnFactory extends FrontConnFactory {

    create(socket) {
        // Server handler chain:
        // >readPacket, auth, command, prepare, query, loadDataInFile
        let handlers = [new FrontAuthHandler()];
        let handler = new FrontReadHandler(handlers);
        
        let id = super.nextId;
        CoHelper.name = 'serverConn-' + id;
        let conn = new ServerConnection(id, socket, handler);
        let failed = true;
        try {
            let mycat = MycatServer.instance;
            let system = mycat.system;
            conn.connManager = mycat.connManager;
            conn.authTimeout = system.authTimeout;
            conn.txIsolation = system.txIsolation;
            conn.privileges = MycatPrivileges.instance;
            failed = false;
            return conn;
        } finally {
            if (failed) conn.close();
        }
    }

}

module.exports = ServerConnFactory;
