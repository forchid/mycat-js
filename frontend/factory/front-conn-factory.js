const UnsupportedError = require("../../lang/unsupported-error");
const MycatServer = require("../../mycat-server");
const Connection = require("../../net/connection");

class FrontConnFactory {
    
    /** Make an frontend connection by a socket.
     * 
     * @param socket A net.Socket
     * @return An FrontConnection
     */
    make(socket) {
        this.preCreate(socket);
        let conn = this.create(socket);
        return this.postCreate(conn);
    }

    preCreate(socket) {

    }

    create(socket) {
        throw new UnsupportedError('create() not impl!');
    }

    postCreate(conn) {
        let mycat = MycatServer.instance;
        let system = mycat.system;
        
        conn.maxAllowedPacket = system.maxAllowedPacket;
        conn.packetHeaderSize = system.packetHeaderSize;
        conn.charset = system.charset;
        conn.traceProtocol = system.traceProtocol;

        return conn;
    }

    get nextId() {
        return Connection.NEXT_ID;
    }

}

module.exports = FrontConnFactory;
