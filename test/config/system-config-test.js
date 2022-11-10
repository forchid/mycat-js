const SystemConfig = require('../../config/system-config');
const IoHelper = require('../../util/io-helper');
const runIf = require('../run-if');

const test = require('test');
const child_process = require('child_process');
const path = require('path');

runIf(__filename, run);

function run() {
    test.setup();

    describe('SystemConfig', () => {
        it('getProperty()', () => {
            let val = SystemConfig.getProperty('a');
            assert.equal(undefined, val);

            val = SystemConfig.getProperty('a', 1);
            assert.equal(1, val);
        });

        it('setProperty()', () => {
            let old = SystemConfig.setProperty('b', 2);
            assert.equal(undefined, old);
            let val = SystemConfig.getProperty('b');
            assert.equal(2, val);

            old = SystemConfig.setProperty('b', -2);
            assert.equal(2, old);
            val = SystemConfig.getProperty('b');
            assert.equal(-2, val);
        });

        it('logFileDisabled()', () => {
            let script = path.join(__dirname, 'sc-enable-log-file.js');
            let cwd = path.join(__dirname, '../../'); // test dir
            let exitCode = child_process.run('fibjs', [script, '-Ddisable-log-console'], { cwd });
            assert.equal(0, exitCode);

            script = path.join(__dirname, 'sc-disable-log-file.js');
            exitCode = child_process.run('fibjs', [script, '-Ddisable-log-file', 
                '-Ddisable-log-console'], { cwd });
            assert.equal(0, exitCode);
            
            let child = child_process.spawn('fibjs', [script, '-Ddisable-log-console'], { cwd });
            child.join();
            assert.notEqual(0, child.exitCode);
        });

        it('homePath', () => {
            const homeDir = path.join(__dirname, '../..');
            const homePath = SystemConfig.homePath;
            assert.equal(homeDir, homePath);
        });

        it('confPath', () => {
            const confDir = path.join(__dirname, '../..', 'conf');
            const confPath = SystemConfig.confPath;
            assert.equal(confDir, confPath);
        });

        it('logsPath', () => {
            const logsDir = path.join(__dirname, '../..', 'logs');
            const logsPath = SystemConfig.logsPath;
            assert.equal(logsDir, logsPath);
        });

        it('resetLogger', () => {
            const logsDir = SystemConfig.logsPath;
            IoHelper.clearDir(logsDir);
            assert.ok(!IoHelper.hasFile(logsDir));

            let script = path.join(__dirname, 'sc-enable-log-file.js');
            let cwd = path.join(__dirname, '../../'); // test dir
            let exitCode = child_process.run('fibjs', [script, '-Ddisable-log-console'], { cwd });
            assert.equal(0, exitCode);
            assert.ok(IoHelper.hasFile(logsDir));

            IoHelper.clearDir(logsDir);
            assert.ok(!IoHelper.hasFile(logsDir));
            script = path.join(__dirname, 'sc-enable-log-file.js');
            cwd = path.join(__dirname, '../../'); // test dir
            exitCode = child_process.run('fibjs', [script, '-Dlog-file-level=WARN', 
                '-Ddisable-log-console'], { cwd });
            assert.equal(0, exitCode);
            assert.ok(!IoHelper.hasFile(logsDir));

            IoHelper.clearDir(logsDir);
            assert.ok(!IoHelper.hasFile(logsDir));
            script = path.join(__dirname, 'sc-enable-log-file.js');
            cwd = path.join(__dirname, '../../'); // test dir
            exitCode = child_process.run('fibjs', [script, '-Dlog-file-level=warn'], { cwd });
            assert.equal(0, exitCode);
            assert.ok(!IoHelper.hasFile(logsDir));

            IoHelper.clearDir(logsDir);
            assert.ok(!IoHelper.hasFile(logsDir));
            script = path.join(__dirname, 'sc-enable-log-file.js');
            cwd = path.join(__dirname, '../../'); // test dir
            exitCode = child_process.run('fibjs', [script, '-Dlog-file-level=INFO', 
                '-Ddisable-log-console'], { cwd });
            assert.equal(0, exitCode);
            assert.ok(IoHelper.hasFile(logsDir));

            IoHelper.clearDir(logsDir);
            assert.ok(!IoHelper.hasFile(logsDir));
            script = path.join(__dirname, 'sc-disable-log-file.js');
            exitCode = child_process.run('fibjs', [script, '-Ddisable-log-file'], { cwd });
            assert.equal(0, exitCode);
            assert.ok(!IoHelper.hasFile(logsDir));
        });
    });

    test.run();
}

module.exports = run;
