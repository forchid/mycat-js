const BufferHelper = require("../../buffer/buffer-helper");
const Handler = require("../../handler");
const CompressHelper = require("../../util/compress-helper");
const Logger = require("../../util/logger");
const FrontPacket = require("../front-packet");
const NetError = require("../net-error");

/**
 * The frontend packet read handler, also supports decompression.
 */
class FrontReadHandler extends Handler {

    constructor (handlers) {
        super (handlers);
    }

    invoke (source) {
        let packets = [];
        let i = 0;

        while (!source.closed) {
            // Multi-packets when compress enabled
            if (i >= packets.length) {
                packets = readPackets(source);
                i = 0;
            }
            let p = packets[i];
            packets[i++] = null;
            if (source.closed) break;
            super.invoke(p);
        }
    }

}

function readPackets(source) {
    let headerSize = source.packetHeaderSize;
    let supportCompress = source.supportCompress;
    if (supportCompress) headerSize = 7; // +3 len of un-comp length field
    const socket = source.socket;

    // Read packet header
    if (source.traceProtocol) {
        Logger.info('F -> S: read header, fill(%s) ..', headerSize);
    }
    let head;
    try {
        head = socket.read(headerSize);
    } catch (e) {
        throw new NetError(e);
    }
    if (head == null) {
        let e = `Peer closed when ${source} read packet header`;
        throw new NetError(e);
    }
    let connManager = source.connManager;
    connManager.addInBytes(head.length);
    let i = 0;
    let length = head[i++] & 0xff;
    length |= (head[i++] & 0xff) << 8;
    length |= (head[i++] & 0xff) << 16;
    length += headerSize;

    // Read packet payload
    let payloadLength = length - headerSize;
    if (source.traceProtocol) {
        Logger.info('F -> S: read payload, fill(%s) ..', payloadLength);
    }
    let payload;
    try {
        payload = socket.read(payloadLength);
    } catch (e) {
        throw new NetError(e);
    }
    if (payload == null) {
        let e = `Peer closed when ${source} read packet payload`;
        throw new NetError(e);
    }
    connManager.addInBytes(payload.length);

    let buffer = Buffer.concat([head, payload]);
    if (source.traceProtocol) {
        let hex = BufferHelper.dumpHex(buffer, 0, length);
        Logger.info('F -> S: read packet -\r\n%s', hex);
    }
    if (supportCompress) {
        let buffers = CompressHelper.decompressMysqlPacket(buffer, length);
        let packets = [];
        for (let buffer of buffers) {
            length = buffer.length;
            let packet = new FrontPacket(source, buffer, length);
            packets.push(packet);
        }
        return packets;
    } else {
        return [new FrontPacket(source, buffer, length)];
    }
}

module.exports = FrontReadHandler;
