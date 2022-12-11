const CompressHelper = require('../../util/compress-helper');
const runIf = require('../run-if');

runIf(__filename, run);

function run() {
    const minCompLen = 50;

    let raw = Buffer.from(
        '2e 00 00 00 03 73 65 6c    65 63 74 20 22 30 31 32'+
        '33 34 35 36 37 38 39 30    31 32 33 34 35 36 37 38'+
        '39 30 31 32 33 34 35 36    37 38 39 30 31 32 33 34'+
        '35 22'.replace(/ /g, ''), 'hex');
    let com = Buffer.from(
        '22 00 00 00 32 00 00 78    9c d3 63 60 60 60 2e 4e'+
        'cd 49 4d 2e 51 50 32 30    34 32 36 31 35 33 b7 b0'+
        'c4 cd 52 02 00 0c d1 0a    6c'.replace(/ /g, ''), 'hex');

    let unc0 = Buffer.from(
        '09 00 00 00 03 53 45 4c    45 43 54 20 31'
        .replace(/ /g, ''), 'hex');
    let unc1 = Buffer.from(
        '0d 00 00 00 00 00 00 09    00 00 00 03 53 45 4c 45'+
        '43 54 20 31'.replace(/ /g, ''), 'hex');

    describe('CompressHelper', () => {
        it ('compress()', () => {
            let bin = [7, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0];
            let buf = Buffer.from(bin);
            let res = CompressHelper.compress(buf);
            res = CompressHelper.decompress(res);
            assert.equal(0, res.compare(buf));

            res = CompressHelper.compress(buf, 3);
            res = CompressHelper.decompress(res);
            assert.equal(0, res.compare(buf.slice(3)));

            res = CompressHelper.compress(buf, 3, 5);
            res = CompressHelper.decompress(res);
            assert.equal(0, res.compare(buf.slice(3, 8)));
        });

        it ('decompressMysqlPacket()', () => {
            let res = CompressHelper.decompressMysqlPacket(com);
            assert.equal(1, res.length);
            assert.equal(0, raw.compare(res[0]));
            res = CompressHelper.decompressMysqlPacket(com, com.length);
            assert.equal(1, res.length);
            assert.equal(0, raw.compare(res[0]));

            res = CompressHelper.decompressMysqlPacket(unc1);
            assert.equal(1, res.length);
            assert.equal(0, unc0.compare(res[0]));
            res = CompressHelper.decompressMysqlPacket(unc1, unc1.length);
            assert.equal(1, res.length);
            assert.equal(0, unc0.compare(res[0]));
        });

        it ('compressMysqlPacket()', () => {
            let res = CompressHelper.compressMysqlPacket(raw, -1, minCompLen);
            assert.equal(0, com.compare(res));
            res = CompressHelper.compressMysqlPacket(raw, raw.length, minCompLen);
            assert.equal(0, com.compare(res));

            res = CompressHelper.compressMysqlPacket([raw], -1, minCompLen);
            assert.equal(0, com.compare(res));
            res = CompressHelper.compressMysqlPacket([raw], 1, minCompLen);
            assert.equal(0, com.compare(res));

            res = CompressHelper.compressMysqlPacket([unc0], -1, minCompLen);
            assert.equal(0, unc1.compare(res));
            res = CompressHelper.compressMysqlPacket([unc0], 1, minCompLen);
            assert.equal(0, unc1.compare(res));

            let mpRaw = Buffer.from(
                '01 00 00 01 01 25 00 00    02 03 64 65 66 00 00 00'+
                '0f 72 65 70 65 61 74 28    22 61 22 2c 20 35 30 29'+
                '00 0c 08 00 32 00 00 00    fd 01 00 1f 00 00 05 00'+
                '00 03 fe 00 00 02 00 33    00 00 04 32 61 61 61 61'+
                '61 61 61 61 61 61 61 61    61 61 61 61 61 61 61 61'+
                '61 61 61 61 61 61 61 61    61 61 61 61 61 61 61 61'+
                '61 61 61 61 61 61 61 61    61 61 61 61 61 61 05 00'+
                '00 05 fe 00 00 02 00'.replace(/ /g, ''), 'hex');
            let mpCom = Buffer.from(
                '4a 00 00 01 77 00 00 78    9c 63 64 60 60 64 54 65'+
                '60 60 62 4e 49 4d 63 60    60 e0 2f 4a 2d 48 4d 2c'+
                'd1 50 4a 54 d2 51 30 35    d0 64 e0 e1 60 30 02 8a'+
                'ff 65 64 90 67 60 60 65    60 60 fe 07 54 cc 60 cc'+
                'c0 c0 62 94 48 32 00 ea    67 05 eb 07 00 8d f9 1c'+
                '64'.replace(/ /g, ''), 'hex');
            res = CompressHelper.compressMysqlPacket(mpRaw, -1, minCompLen);
            assert.equal(0, mpCom.compare(res));

            res = CompressHelper.decompressMysqlPacket(mpCom);
            assert.equal(5, res.length);
            res = Buffer.concat(res);
            assert.equal(0, mpRaw.compare(res));
        });
    });
}

module.exports = run;
