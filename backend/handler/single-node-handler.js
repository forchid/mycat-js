const Handler = require("../../handler");
const UnsupportedError = require("../../lang/unsupported-error");
const MycatServer = require("../../mycat-server");
const EofPacket = require("../../net/mysql/eof-packet");
const FieldPacket = require("../../net/mysql/field-packet");
const Fields = require("../../net/mysql/fields");
const ResultSetHeaderPacket = require("../../net/mysql/result-set-header-packet");
const RowPacket = require("../../net/mysql/row-packet");
const SqlObject = require("../../sql/sql-object");
const Logger = require("../../util/logger");

class SingleNodeHandler extends Handler {

    source = null;
    node = null;

    invoke(routedQuery) {
        let { route, source } = routedQuery;
        this.source = source;

        if (route.nodeCount !== 1) {
            let e = `Route node count ${route.nodeCount}`;
            throw new Error(e);
        }

        let node = this.node = route.nodes[0];
        let autoCommit = source.autoCommit;
        let backConn = this.getBackend();
        try {
            let stmt = node.statement;
            let result = backConn.execute(stmt.sql);
            switch (stmt.type) {
                case SqlObject.TYPE_STMT_SELECT:
                    this.sendResultSet(stmt, result);
                    break;
                default:
                    // TODO
                    throw new UnsupportedError("Not impl");
            }
        } finally {
            if (autoCommit) {
                source.unbindBackend(backConn);
            }
            this.node = null;
            this.source = null;
        }
    }

    sendResultSet(stmt, result) {
        let selExprs = stmt.selectExprs;
        let source = this.source;
        let fieldCount = selExprs.length;
        let p = 0, seq = 1;
        let rowCount = result.length;
        let row = rowCount? result[0]: null;
        Logger.debug("Field count %s, result '%s'", 
            fieldCount, JSON.stringify(result));

        // Header
        let header = new ResultSetHeaderPacket(fieldCount);
        header.sequenceId = seq++;
        p = header.write(source, p);
        Logger.debug("Position %s after header.", p);

        // Fields
        let charset = source.charset;
        for (let i = 0; i < fieldCount; ++i) {
            let alias = selExprs[i].alias;
            let packet = new FieldPacket();
            packet.sequenceId = seq++;
            packet.charsetIndex = source.charsetIndex;
            packet.name = Buffer.from(alias, charset);
            packet.type = Fields.type(row[i]);
            p = packet.write(source, p);
        }
        Logger.debug("Position %s after fields.", p);
        // Field eof
        let eof = new EofPacket();
        eof.sequenceId = seq++;
        p = eof.write(source, p);
        Logger.debug("Position %s after field eof.", p);

        // Rows
        let last = null;
        Logger.debug("Row count %s", rowCount);
        for (let i = 0; i < rowCount; ++i) {
            let packet = new RowPacket(fieldCount);
            let row = result[i];
            for (let j = 0; j < fieldCount; ++j) {
                let alias = selExprs[j].alias;
                let value = row[alias] || null;
                Logger.debug("Row %s. %s: %s", i, alias, value);
                if (value) value = Buffer.from(value, charset);
                packet.append(value);
            }
            if (last) seq = last.sequenceId;
            packet.sequenceId = seq;
            p = packet.write(source, p);
            last = packet;
        }
        Logger.debug("Position %s after rows.", p);
        // Row eof
        eof.sequenceId = last? last.sequenceId: seq++;
        p = eof.write(source, p, true);
        Logger.debug("Position %s after row eof.", p);
    }

    getBackend() {
        let node = this.node;
        let source = this.source;
        let backConn = source.getBackend(node);

        if (!backConn) {
            let serverConfig = MycatServer.instance.config;
            let dataNode = serverConfig.dataNodes.get(node.name);
            let autoCommit = source.autoCommit;
            backConn = dataNode.getConnection(autoCommit, node);
            let failed = true;
            try {
                source.bindBackend(node, backConn);
                failed = false;
            } finally {
                if (failed) backConn.close();
            }
        }

        return backConn;
    }

}

module.exports = SingleNodeHandler;
