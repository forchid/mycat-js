const BufferHelper = require("../../buffer/buffer-helper");
const Handler = require("../../handler");
const MycatServer = require("../../mycat-server");
const Logger = require("../../util/logger");
const ErrorCode = require("../mysql/error-code");
const MysqlPacket = require("../mysql/mysql-packet");

/**
 * The frontend command dispatcher.
 * @author little-pan
 * @since 2022-11-28
 */
class FrontCmdHandler extends Handler {

    invoke(packet) {
        let source = packet.source;
        let buffer = packet.buffer;
        let length = packet.length;

        if (source.loadDataStarted) {
            // TODO load data in file
            return;
        }

        const counter = source.cmdCounter;
        const cmd = buffer[4];
        switch (cmd) {
            case MysqlPacket.COM_QUIT:
                counter.quit++;
                source.close("quit cmd");
                break;
            default:
                counter.other++;
                let config = MycatServer.instance.config;
                if (config.system.ignoreUnknownCommand) {
                    source.ping();
                } else {
                    let hex = BufferHelper.dumpHex(buffer, 0, length);
                    Logger.warn("Unknown command: \r\n%s", hex);
                    let seq = buffer.readUInt8(3) + 1;
                    source.sendError(seq, ErrorCode.ER_UNKNOWN_COM_ERROR);
                }
                break;
        }
    }

}

module.exports = FrontCmdHandler;
