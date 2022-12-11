const BufferHelper = require("../../buffer/buffer-helper");
const Handler = require("../../handler");
const CompressHelper = require("../../util/compress-helper");
const Logger = require("../../util/logger");
const NetError = require("../../net/net-error");
const ErrorCode = require("../../net/mysql/error-code");

/**
 * The frontend packet read handler, also supports decompression.
 */
class FrontReadHandler extends Handler {

    constructor (handlers) {
        super (handlers);
    }

    invoke (source) {
        let packets = [];
        let compRest = null;
        let i = 0;

        while (!source.closed) {
            // Multi-packets is possible when compression
            if (i >= packets.length) {
                let r = readPackets(source, compRest);
                packets = r.packets;
                compRest = r.compRest || null;
                i = 0;
            }
            let p = packets[i];
            packets[i++] = null;
            if (source.closed) break;
            super.invoke(p);
        }
    }

}

function readPackets(source, compRest) {
    let supportCompress = source.supportCompress;
    if (supportCompress) return readCompressed(source, compRest); 
    else return readUnCompressed(source);
}

function readUnCompressed(source) {
    const socket = source.socket;
    const connManager = source.connManager;
    const headerSize = source.packetHeaderSize;
    const maxAllowedPacket = source.maxAllowedPacket;
    const maxPacketLen = 0xffffff;
    let packetLength = 0; // Logical payload length( <= maxAllowedPacket)
    let payloadLen = maxPacketLen;
    let buffer = null;
    let length = 0;

    // Loop for big packet
    for (; payloadLen === maxPacketLen; ) {
        // Read packet header
        if (source.traceProtocol) {
            Logger.info('F -> S: read uncompressed header, fill(%s) ..', headerSize);
        }
        let head;
        try {
            head = socket.read(headerSize);
        } catch (e) {
            throw new NetError(e);
        }
        if (head == null) {
            let e = `Peer closed when ${source} read uncompressed packet header`;
            throw new NetError(e);
        }
        connManager.addInBytes(head.length);
        
        // Read packet payload
        payloadLen = BufferHelper.readUInt24LE(head, 0);
        packetLength += payloadLen;
        if (packetLength > maxAllowedPacket) {
            source.sendError(2, ErrorCode.ER_NET_PACKET_TOO_LARGE);
            source.close("Got a bigger packet");
            return;
        }
        if (source.traceProtocol) {
            Logger.info('F -> S: read uncompressed payload, fill(%s) ..', payloadLen);
        }
        let payload;
        try {
            payload = socket.read(payloadLen);
        } catch (e) {
            throw new NetError(e);
        }
        if (payload == null) {
            let e = `Peer closed when ${source} read uncompressed packet payload`;
            throw new NetError(e);
        }
        connManager.addInBytes(payload.length);
        if (source.traceProtocol) {
            let buf = Buffer.concat([head, payload]);
            let hex = BufferHelper.dumpHex(buf, 0, buf.length);
            Logger.info('F -> S: read an uncompressed packet -\r\n%s', hex);
        }

        if (buffer) {
            buffer = Buffer.concat([buffer, payload]);
        } else {
            buffer = Buffer.concat([head, payload]);
            length += headerSize;
        }
        length += payloadLen;
    }

    let packets = [{ source, buffer, length }];
    return { packets };
}

function readCompressed(source, compRest) {
    const socket = source.socket;
    const connManager = source.connManager;
    const headerSize = source.packetHeaderSize + 3; // +3 len of un-comp length field
    const maxAllowedPacket = source.maxAllowedPacket;
    const maxPacketLen = 0xffffff - 4; // -4 len of un-comp header
    let packetLength = 0; // Logical payload length( <= maxAllowedPacket)
    let payloadLen = maxPacketLen;
    let buffer = compRest;
    const packets = [];

    compRest = null;
    // Loop for big packet
    for (; payloadLen === maxPacketLen; ) {
        // Read packet header
        if (source.traceProtocol) {
            Logger.info('F -> S: read compressed header, fill(%s) ..', headerSize);
        }
        let head;
        try {
            head = socket.read(headerSize);
        } catch (e) {
            throw new NetError(e);
        }
        if (head == null) {
            let e = `Peer closed when ${source} read compressed packet header`;
            throw new NetError(e);
        }
        connManager.addInBytes(head.length);
        
        // Read packet payload
        const compLen = BufferHelper.readUInt24LE(head, 0);
        let length = headerSize + compLen;
        payloadLen = BufferHelper.readUInt24LE(head, 4);
        if (payloadLen === 0) payloadLen = compLen;
        else payloadLen -= 4;
        packetLength += payloadLen;
        if (packetLength > maxAllowedPacket) {
            source.sendError(2, ErrorCode.ER_NET_PACKET_TOO_LARGE);
            source.close("Got a bigger packet");
            return;
        }
        if (source.traceProtocol) {
            Logger.info('F -> S: read compressed payload, fill(%s) ..', compLen);
        }
        let payload;
        try {
            payload = socket.read(compLen);
        } catch (e) {
            throw new NetError(e);
        }
        if (payload == null) {
            let e = `Peer closed when ${source} read compressed packet payload`;
            throw new NetError(e);
        }
        connManager.addInBytes(payload.length);

        let compressed = Buffer.concat([head, payload]);
        if (source.traceProtocol) {
            let hex = BufferHelper.dumpHex(compressed, 0, length);
            Logger.info('F -> S: read a compressed packet -\r\n%s', hex);
        }
        let buffers = CompressHelper.decompressMysqlPacket(compressed, length);

        length = buffer? buffer.length: 0;
        for (let buf of buffers) {
            payloadLen = BufferHelper.readUInt24LE(buf, 0);
            if (buffer) {
                let sub = buf.slice(4);
                buffer = Buffer.concat([buffer, sub]);
                length += sub.length; 
            } else {
                buffer = buf;
                length += buffer.length;
            }
            if (payloadLen === maxPacketLen) {
                compRest = buf;
            } else {
                packets.push({ source, buffer, length });
                buffer = compRest = null;
                length = 0;
            }
        }
    }

    return { packets, compRest };
}

module.exports = FrontReadHandler;
