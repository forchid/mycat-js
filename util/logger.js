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

    static log() {
        if (console.loglevel >= console.INFO) {
            doLog('log', arguments);
        }
    }

    static info() {
        if (console.loglevel >= console.INFO) {
            doLog('info', arguments);
        }
    }

    static debug() {
        if (console.loglevel >= console.DEBUG) {
            doLog('debug', arguments);
        }
    }

    static notice() {
        if (console.loglevel >= console.NOTICE) {
            doLog('notice', arguments);
        }
    }

    static warn() {
        if (console.loglevel >= console.WARN) {
            doLog('warn', arguments);
        }
    }

    static error() {
        if (console.loglevel >= console.ERROR) {
            doLog('error', arguments);
        }
    }

    static crit() {
        if (console.loglevel >= console.CRIT) {
            doLog('crit', arguments);
        }
    }

    static alert() {
        if (console.loglevel >= console.ALERT) {
            doLog('alert', arguments);
        }
    }

    static print() {
        if (console.loglevel >= console.PRINT) {
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
            arg = '%s [%s][%s] '+ arg;
            let d = new Date();
            d = StringHelper.formatTimestamp(d);
            let m = method;
            if (m.length === 3) m += '   ';
            else if (m.length === 4) m += '  ';
            else if (m.length === 5) m += ' ';
            news.push(arg);
            news.push(d);
            news.push(m.toUpperCase());
            news.push(name);
        } else {
            news.push(arg);
        }
    }

    func.apply(console, news);
}

module.exports = Logger;
