const process = require('process');
const path = require('path');

const cwd = process.cwd();
const pro = process.argv[1];
const script = path.resolve(cwd, pro);

function runIf(file, run) {
    if (script == file) run();
}

module.exports = runIf;
