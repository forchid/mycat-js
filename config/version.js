class Version {

    static #SERVER_VERSION = Buffer.from('5.6.29-mycat-js-1.6.7.6-release-20221105210901');

    /** Client/server protocol version. */
    static get PROTOCOL_VERSION() { return 10; }

    static get SERVER_VERSION() { return this.#SERVER_VERSION; }

    static setMysqlVersion(mysqlVersion) {
        let sv = Version.SERVER_VERSION;
        let sep = '-'.codePointAt(0);
        let i = 0;
        for (; i < sv.length; ++i) {
            if (sv[i] === sep) break;
        }

        let mv = Buffer.from(mysqlVersion);
        let tv = Buffer.allocUnsafe(sv.length - i);
        sv.copy(tv, 0, i, sv.length);
        Version.#SERVER_VERSION = Buffer.concat([mv, tv]);
    }

}

module.exports = Version;
