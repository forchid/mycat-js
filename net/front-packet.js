class FrontPacket {

    #source = null;
    #buffer = null;
    #length = 0;

    constructor (source, buffer, length) {
        this.#source = source;
        this.#buffer = buffer;
        this.#length = length;
    }

    get source() { return this.#source; }

    get buffer() { return this.#buffer; }

    get length() { return this.#length; }

}

module.exports = FrontPacket;
