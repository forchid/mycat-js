const UnsupportedError = require("../lang/unsupported-error");
const StringHelper = require("./string-helper");
const CoHelper = require("./co-helper");
const co = require('coroutine');

/**
 * A wrapper of console logger, adds timestamp, log level and coroutine
 * name into logs. 
 */
class Logger {

    constructor() {
        throw new UnsupportedError('Logger()');
    }

    static get level() {
        return console.loglevel;
    }

    static get debugEnabled() {
        return (this.level >= console.DEBUG);
    }

    static log() {
        if (this.level >= console.INFO) {
            doLog('log', arguments);
        }
    }

    static info() {
        if (this.level >= console.INFO) {
            doLog('info', arguments);
        }
    }

    static debug() {
        if (this.level >= console.DEBUG) {
            doLog('debug', arguments);
        }
    }

    static notice() {
        if (this.level >= console.NOTICE) {
            doLog('notice', arguments);
        }
    }

    static warn() {
        if (this.level >= console.WARN) {
            doLog('warn', arguments);
        }
    }

    static error() {
        if (this.level >= console.ERROR) {
            doLog('error', arguments);
        }
    }

    static crit() {
        if (this.level >= console.CRIT) {
            doLog('crit', arguments);
        }
    }

    static alert() {
        if (this.level >= console.ALERT) {
            doLog('alert', arguments);
        }
    }

    static print() {
        if (this.level >= console.PRINT) {
            doLog('print', arguments);
        }
    }
}

function doLog(method, args) {
    let n = args.length;
    if (n === 0) {
        return;
    }

    let func = console[method];
    let curr = co.current();
    let name = CoHelper.name || 'coroutine-'+curr.id;
    let news = [];

    for (let i = 0; i < n; ++i) {
        let arg = args[i];
        if (i === 0) {
            let f = '%s [%s][%s] '+ arg;
            let d = StringHelper.formatTimestamp(new Date());
            let m = method.toUpperCase();
            if (m === 'LOG') m = 'INFO';
            else if (m === 'NOTICE') m = 'NOTE';
            if (m.length === 4) m += ' ';
            news.push(f);
            news.push(d);
            news.push(m);
            news.push(name);
        } else {
            news.push(arg);
        }
    }

    func.apply(console, news);
}

module.exports = Logger;
