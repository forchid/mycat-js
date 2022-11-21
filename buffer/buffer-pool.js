const SystemConfig = require("../config/model/system-config");
const ArgumentError = require("../lang/argument-error");
const TypeHelper = require("../util/type-helper");
const BufferError = require("./buffer-error");

const co = require("coroutine");

/**
 * A buffer pool that only limit memory usage.
 * @author little-pan
 * @since 2022-11-20
 */
class BufferPool {

    #chunkSize = SystemConfig.DEFAULT_BUFFER_CHUNK_SIZE;
    #pageSize = SystemConfig.DEFAULT_BUFFER_POOL_PAGE_SIZE;
    #pageCount = SystemConfig.DEFAULT_PROCESSORS * 64;

    #available = new co.Event();
    #totalSize = this.#pageSize * this.#pageCount;
    #allocated = 0;

    constructor (chunkSize, pageSize, pageCount) {
        if (chunkSize !== undefined) {
            this.#chunkSize = TypeHelper.ensureInteger(chunkSize, 'chunkSize');
            if (chunkSize < 1) throw new ArgumentError(`chunkSize less than 1: ${chunkSize}`);
        }

        if (pageSize !== undefined) {
            this.#pageSize = TypeHelper.ensureInteger(pageSize, 'pageSize');
            if (pageSize < 1) throw new ArgumentError(`pageSize less than 1: ${pageSize}`);
        }

        if (pageCount !== undefined) {
            this.#pageCount = TypeHelper.ensureInteger(pageCount, 'pageCount');
            if (pageCount < 1) throw new ArgumentError(`pageCount less than 1: ${pageCount}`);
        }

        this.#totalSize = this.#pageSize * this.#pageCount;
        if (chunkSize !== undefined && this.#totalSize < chunkSize) {
            let e = `pageSize * pageCount ${this.#totalSize} less than chunkSize ${chunkSize}!`;
            throw new ArgumentError(e);
        }
        console.info(`Buffer pool total size ${this.#totalSize >> 20}M.`);
    }

    allocate(size, unsafe = true, await = false) {
        if (size === 0 || size === undefined) size = this.#chunkSize;
        TypeHelper.ensureInteger(size, 'size');
        if (size < 0) throw new ArgumentError(`size(${size}) less than 0`);

        let rem = size % this.#chunkSize;
        if (rem > 0) size +=  this.#chunkSize - rem;
        let n = size + this.allocated;

        while (n > this.totalSize) {
            if (await) {
                this.#available.clear();
                this.#available.wait();
                n = size + this.allocated;
            } else {
                throw new BufferError(`Can't allocate buffer: size ${size}`);
            }
        }

        let buffer;
        if (unsafe) buffer = Buffer.allocUnsafe(size);
        else buffer = Buffer.alloc(size);
        this.#allocated += size;
        buffer._allocated = true;

        return buffer;
    }

    release(buffer) {
        if (buffer instanceof Buffer) {
            if (buffer._allocated) {
                this.#allocated -= buffer.length;
                delete buffer._allocated;
                this.#available.set();
                return true;
            }
        }

        return false;
    }

    get chunkSize() {
        return this.#chunkSize;
    }

    get pageSize() {
        return this.#pageSize;
    }

    get pageCount() {
        return this.#pageCount;
    }

    get totalSize() {
        return this.#totalSize;
    }

    get allocated() {
        return this.#allocated;
    }

}

module.exports = BufferPool;
