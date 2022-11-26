const IoHelper = require('../../util/io-helper');
const runIf = require('../run-if');

runIf(__filename, run);

function run() {

    describe('IoHelper', () => {
        it ('dumpHex()', () => {
            let buf = Buffer.from([]);
            let s = IoHelper.dumpHex(buf);
            assert.equal('', s);

            buf = Buffer.from([0]);
            s = IoHelper.dumpHex(buf);
            assert.equal(53, s.length);
            assert.equal('  00                                                .', s);
            buf = Buffer.from([0, 1]);
            s = IoHelper.dumpHex(buf);
            assert.equal('  00 01                                             ..', s);
            buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]);
            s = IoHelper.dumpHex(buf);
            assert.equal(60, s.length);
            assert.equal('  00 01 02 03 04 05 06 07                           ........', s);

            buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8]);
            s = IoHelper.dumpHex(buf);
            assert.equal('  00 01 02 03 04 05 06 07  08                       .........', s);
            buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
            s = IoHelper.dumpHex(buf);
            assert.equal('  00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F  ................', s);

            buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
            s = IoHelper.dumpHex(buf);
            assert.equal('  00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F  ................\r\n  10                                                .', s);
        
            buf = Buffer.from([0x61, 0x7a]);
            s = IoHelper.dumpHex(buf);
            assert.equal('  61 7A                                             az', s);
            buf = Buffer.from([0, 1, 2, 0x61, 0x7a]);
            s = IoHelper.dumpHex(buf, 3, -1);
            assert.equal('  61 7A                                             az', s);
            buf = Buffer.from([0, 1, 2, 0x61, 0x7a, 5]);
            s = IoHelper.dumpHex(buf, 3, 5);
            assert.equal('  61 7A                                             az', s);
            buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
            s = IoHelper.dumpHex(buf, 0, 8);
            assert.equal('  00 01 02 03 04 05 06 07                           ........', s);

            buf = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
            s = IoHelper.dumpHex(buf, 0, 8, '');
            assert.equal('00 01 02 03 04 05 06 07                           ........', s);
        });
    });
}

module.exports = run;
