const BufferHelper = require("../../buffer/buffer-helper");
const Handler = require("../../handler");
const Logger = require("../../util/logger");
const FrontPacket = require("../front-packet");

/**
 * The frontend packet read handler.
 */
class FrontReadHandler extends Handler {

    constructor (handlers) {
        super (handlers);
    }

    invoke (source) {
        for (;!source.closed;) {
            let p;
            try {
                p = readPacket(source);
            } catch (e) {
                source.close(e + '');
                break;
            }
            super.invoke(p);
        }
    }

}

function readPacket(source) {
    let headerSize = source.packetHeaderSize;
    if (source.supportCompress) headerSize = 7; // +3 len of un-comp length field
    const socket = source.socket;

    // Read packet header
    if (source.traceProtocol) {
        Logger.info('F -> S: read header, fill(%s) ..', headerSize);
    }
    const head = socket.read(headerSize);
    if (head == null) {
        let e = `Peer socket has been closed when read packet header`;
        throw new Error(e);
    }
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
    const payload = socket.read(payloadLength);
    if (payload == null) {
        let e = `Peer socket has been closed when read packet payload`;
        throw new Error(e);
    }

    let buffer = Buffer.concat([head, payload]);
    if (source.traceProtocol) {
        let hex = BufferHelper.dumpHex(buffer, 0, length);
        Logger.info('F -> S: read packet -\r\n%s', hex);
    }
    return new FrontPacket(source, buffer, length, headerSize);
}

module.exports = FrontReadHandler;
