/**
 * Network io error when read from, or write into network.
 * 
 * @since 2022-11-27
 * @author little-pan  
 */
class NetError extends Error {

    constructor (message) {
        super (messageStr(message));
        this.name = this.constructor.name;
    }

}

function messageStr(m) {
    if (m instanceof Error) 
        return m.message;
    else 
        m + '';
}

module.exports = NetError;
