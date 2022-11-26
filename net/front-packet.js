class FrontPacket {

    #source = null;
    #buffer = null;
    #length = 0;
    #headerSize = 0;

    constructor (source, buffer, length, headerSize) {
        this.#source = source;
        this.#buffer = buffer;
        this.#length = length;
        this.#headerSize = headerSize;
    }

    get source() { return this.#source; }

    get buffer() { return this.#buffer; }

    get length() { return this.#length; }

    get headerSize() { return this.#headerSize; }

}

module.exports = FrontPacket;
