const IoHelper = require("../util/io-helper");
const TypeHelper = require("../util/type-helper");

class BufferHelper {

    static readUInt24LE(buffer, p = 0) {
        TypeHelper.ensureInstanceof(buffer, Buffer, 'buffer');
        let i = buffer[p] & 0xff;
        i |= (buffer[p + 1] & 0xff) << 8;
        i |= (buffer[p + 2] & 0xff) << 16;
        return i;
    }

    static writeUInt24LE(buffer, i, p = 0) {
        TypeHelper.ensureInstanceof(buffer, Buffer, 'buffer');
        TypeHelper.ensureInteger(i, 'i');
        buffer.writeUInt8(i, p++);
        buffer.writeUInt8(i >>> 8, p++);
        buffer.writeUInt8(i >>> 16, p++);
    }

    static dumpHex(buffer, start = 0, end = -1, indent = '  ') {
        TypeHelper.ensureInstanceof(buffer, Buffer, 'buffer');
        return IoHelper.dumpHex(buffer, start, end, indent);
    }

}

module.exports = BufferHelper;
