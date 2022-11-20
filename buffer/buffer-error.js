/**
 * A buffer error that represents buffer allocation failure.
 * @author little-pan
 * @since 2022-11-20
 */
class BufferError extends Error {

    constructor(message) {
        super(message);
        this.name = 'BufferError';
    }

}

module.exports = BufferError;
