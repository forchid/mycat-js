const TypeHelper = require('../util/type-helper');

/**
 * Net utils.
 * 
 * @author little-pan
 * @since 2022-11-14
 */
class NetHelper {

    static ensurePort(port) {
        TypeHelper.ensureInteger(port);
        if (port >= 0 && port <= 65535) {
            return port;
        } else {
            throw new RangeError(`port ${port} exceeds the range [0, 65535]`);
        }
    }

}

module.exports = NetHelper;
