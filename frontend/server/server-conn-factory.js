const MycatPrivileges = require("../../config/mycat-privileges");
const MycatServer = require("../../mycat-server");
const FrontAuthHandler = require("../handler/front-auth-handler");
const FrontConnFactory = require("../factory/front-conn-factory");
const FrontReadHandler = require("../handler/front-read-handler");
const CoHelper = require("../../util/co-helper");
const ServerConnection = require("./server-connection");
const FrontCmdHandler = require("../handler/front-cmd-handler");
const FrontQueryHandler = require("../handler/front-query-handler");

class ServerConnFactory extends FrontConnFactory {

    create(socket) {
        // Server handler chain:
        // >read, auth, command, prepare, query, loadDataInFile
        let handlers = [
            new FrontAuthHandler(),
            new FrontCmdHandler(), 
            new FrontQueryHandler()
        ];
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
