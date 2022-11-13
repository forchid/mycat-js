
const SystemConfig = require('../config/system-config');
const process = require('process');
const path = require('path');
const test = require('test');

const cwd = process.cwd();
const pro = process.argv[1];
const script = path.resolve(cwd, pro);
const debug = SystemConfig.enableTestDebug;

function runIf(file, run) {
    if (script == file) {
        test.setup();
        run();
        test.run(debug? console.DEBUG: undefined);
    }
}

module.exports = runIf;
