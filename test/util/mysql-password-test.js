const MysqlPassword = require('../../util/mysql-password');
const runIf = require('../run-if');

runIf(__filename, run);

function run() {
    describe('MysqlPassword', () => {
        it ('scramble411()', () => {
            let exp = 'ba52eaf30d0b71ceb3c4256445a420107b0f6fbc';
            let pass = Buffer.from('123456');
            let seed = Buffer.from('bf32c8a5884daaa6850d453a1f6309d4281a4ccd', 'hex');
            let res = MysqlPassword.scramble411(pass, seed).hex();
            
            assert.equal(exp, res);
        });
    });
}

module.exports = run;
