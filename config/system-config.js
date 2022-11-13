const process = require('process');
const path = require('path');
const fs = require('fs');

class SystemConfig {

    static #ARGV = parseArgv(); //{ props: {}, args: [] };
    static #PROP_SYS_HOME = 'MYCAT_HOME';
    static #PROP_LOG_FILE_DISABLED = 'disable-log-file';

    constructor() {
        
    }

    static getProperty(prop, def) {
        const value = this.#ARGV.props[prop];
        if (value === undefined) return def;
        else return value;
    }

    static setProperty(prop, value) {
        const props = this.#ARGV.props;
        let old = props[prop];
        props[prop] = value;
        return old;
    }

    static get logFileDisabled() {
        return !!this.getProperty(this.#PROP_LOG_FILE_DISABLED);
    }

    static get SYS_HOME() {
        return this.#PROP_SYS_HOME;
    }

    static get DEFAULT_POOL_SIZE() {
        return 128;
    }

    static get ENCODING() {
        return 'utf-8';
    }

    static get confPath() {
        return path.join(this.homePath, 'conf');
    }

    static get logsPath() {
        return path.join(this.homePath, 'logs');
    }

    static get homePath() {
        // Home path lookup: argv, env, cwd, BIN
        const prop = this.SYS_HOME;
        const props = this.#ARGV.props;
        let home = props[prop];
        if (home) return home;
        
        const env = process.env;
        home = env[prop];
        if (home) return props[prop] = home;

        home = process.cwd();
        let conf = path.join(home, "conf");
        try {
            if (fs.stat(conf).isDirectory()) 
                return props[prop] = home;
        } catch (e) {
            if (e.code != 'ENOENT') throw e;
        }

        home = path.join(__dirname, '..');
        conf = path.join(home, "conf");
        try {
            if (fs.stat(conf).isDirectory()) 
                return props[prop] = home;
        } catch (e) {
            if (e.code != 'ENOENT') throw e;
        }
         
        return null;
    }

    static get enableTestDebug() {
        const props = this.#ARGV.props;
        return !!props['enable-test-debug'];
    }

    static resetLogger() {
        console.reset();

        const consDisabled = this.getProperty('disable-log-console', false);
        if (!consDisabled) console.add('console');
        if (this.logFileDisabled) return;

        let level = this.getProperty('log-file-level', 'INFO');
        level = parseLevel(level);
        
        const home = this.homePath;
        const dir = path.join(home, 'logs');
        const file = path.join(dir, 'mycat-%s.log');
        if (!fs.existsSync(dir)) fs.mkdir(dir);

        const split = this.getProperty('log-file-split', '10m');
        let count = this.getProperty('log-file-max');
        count = parseInt(count);
        if (isNaN(count)) count = 10;
        
        console.add({
            type: 'file',
            levels: [level],
            path: file,
            // Optional: 'day', 'hour', 'minute', '###k', '###m', '###g'，default '1m'
            split: split,
            // Optional: 2-128，default 128
            count: count
        });

        function parseLevel(level) {
            level = level.toUpperCase();
            switch(level) {
                case 'FATAL':
                    return console.FATAL;
                case 'ALERT':
                    return console.ALERT;
                case 'CRIT':
                    return console.CRIT;
                case 'ERROR':
                    return console.ERROR;
                case 'WARN':
                    return console.WARN;
                case 'INFO':
                    return console.INFO;
                case 'DEBUG':
                    return console.DEBUG;
                case 'PRINT':
                    return console.PRINT;
                case 'NOTSET':
                    return console.NOTSET;
                default:
                    return console.INFO;
            }
        }
    }
}

function parseArgv() {
    // argv format: -Da=1 -Db=2 -Dt x y z 
    const argv = process.argv;
    const n = argv.length;
    const props = {};
    const args = [];

    for (let i = 2; i < n; ++i) {
        const arg = argv[i];
        if (arg.startsWith('-D')) {
            let prop = arg.slice(2);
            let j = prop.indexOf('=');
            if (j == -1) {
                props[prop] = true; // bool flag
                continue;
            }

            let val = prop.slice(j + 1);
            prop = prop.slice(0, j);
            props[prop] = val;
        } else {
            args.push(arg);
        }
    }

    return { props, args };
}

module.exports = SystemConfig;
