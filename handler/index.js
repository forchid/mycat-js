/**
 * A generic message handler framework.
 * 
 * @author little-pan
 * @since 2022-11-22
 */
class Handler {

    #handlers = null;

    /** Create an handler by an function, array of handler, 
     * or object of handler.
     * 
     * @param handlers
     */
    constructor (handlers) {
        this.#handlers = handlers || null;
    }

    get handlers() {
        return this.#handlers;
    }

    has(key) {
        return !!this.handlers[key];
    }

    handler(key) {
        let h;

        if (key === undefined) {
            h = this.handlers;
        } else {
            h = this.handlers[key];
        }

        if (h instanceof Handler) {
            return h;
        } else {
            return new Handler(h);
        }
    }

    /** Handle the message.
     * 
     * @param message the message
     * @param raise throw an error if handler type error, default true
     * 
     * @returns An next handler, function, or not undefined if handle
     * the next handler with the return value in the handler chain, 
     * otherwise undefined for stop handling the next handler.
     */
    invoke(message, raise = true) {
        return doInvoke(this.handlers, message, raise);
    }

}

function doInvoke(handlers, message, raise = true) {
    let r; // Last value, or undefined

    if (handlers) {
        if (handlers instanceof Handler) {
            r = handlers.invoke(message);
        } else if (handlers instanceof Function) {
            r = handlers(message);
        } else if (handlers instanceof Array) {
            for (let h of handlers) {
                r = iterate (h, raise);
                if (r === undefined) {
                    break;
                }
            }
        } else if (handlers instanceof Object) {
            for (let name in handlers) {
                let h = handlers[name];
                r = iterate (h, raise);
                if (r === undefined) {
                    break;
                }
            }
        } else if (raise) {
            let e = `The handler type error: should be Function, Array, Object, or Handler`;
            throw new Error(e);
        }
    }

    // Invoke handler chain ...
    if (r instanceof Handler || r instanceof Function) {
        r = doInvoke(r, message, raise);
    }

    return r;

    function iterate (h, raise) {
        let v = doInvoke(h, message, raise);

        if (v !== undefined) {
            message = v; // Transfer
        }

        return v;
    }

}

module.exports = Handler;
