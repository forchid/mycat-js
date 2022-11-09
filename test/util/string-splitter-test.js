const StringSplitter = require('../../util/string-splitter');
const runIf = require('../run-if');

const test = require('test');

runIf(__filename, run);

function run() {
    test.setup();
    let [ fi, se, th, le, ri ] = [ ',', '$', '-', '0', '0' ];

    describe('StringSplitter', () => {
        it ('split()', () => {
            let s = null;
            let a = StringSplitter.split(s, fi);
            assert.equal(null, a);

            s = '';
            a = StringSplitter.split(s, fi);
            assert.equal(1, a.length);
            assert.equal('', a[0]);
            
            s = ' ';
            a = StringSplitter.split(s, fi);
            assert.equal(1, a.length);
            assert.equal('', a[0]);

            s = ' ';
            a = StringSplitter.split(s, fi, false);
            assert.equal(1, a.length);
            assert.equal(' ', a[0]);

            s = 'a';
            a = StringSplitter.split(s, fi);
            assert.equal(1, a.length);
            assert.equal('a', a[0]);

            s = ',';
            a = StringSplitter.split(s, fi);
            assert.equal(2, a.length);
            assert.equal('', a[0]);
            assert.equal('', a[1]);

            s = 'a,';
            a = StringSplitter.split(s, fi);
            assert.equal(2, a.length);
            assert.equal('a', a[0]);
            assert.equal('', a[1]);

            s = ',b';
            a = StringSplitter.split(s, fi);
            assert.equal(2, a.length);
            assert.equal('', a[0]);
            assert.equal('b', a[1]);

            s = 'a, b';
            a = StringSplitter.split(s, fi);
            assert.equal(2, a.length);
            assert.equal('a', a[0]);
            assert.equal('b', a[1]);
            a = StringSplitter.split(s, fi, false);
            assert.equal(2, a.length);
            assert.equal('a', a[0]);
            assert.equal(' b', a[1]);

            s = 'a, b ';
            a = StringSplitter.split(s, fi);
            assert.equal(2, a.length);
            assert.equal('a', a[0]);
            assert.equal('b', a[1]);
            a = StringSplitter.split(s, fi, false);
            assert.equal(2, a.length);
            assert.equal('a', a[0]);
            assert.equal(' b ', a[1]);

            s = ' a, b ';
            a = StringSplitter.split(s, fi);
            assert.equal(2, a.length);
            assert.equal('a', a[0]);
            assert.equal('b', a[1]);
            a = StringSplitter.split(s, fi, false);
            assert.equal(2, a.length);
            assert.equal(' a', a[0]);
            assert.equal(' b ', a[1]);

            s = ' a , b ';
            a = StringSplitter.split(s, fi);
            assert.equal(2, a.length);
            assert.equal('a', a[0]);
            assert.equal('b', a[1]);
            a = StringSplitter.split(s, fi, false);
            assert.equal(2, a.length);
            assert.equal(' a ', a[0]);
            assert.equal(' b ', a[1]);

            s = 'a,b,c';
            a = StringSplitter.split(s, fi);
            assert.equal(3, a.length);
            assert.equal('a', a[0]);
            assert.equal('b', a[1]);
            assert.equal('c', a[2]);

            s = 1;
            try {
                a = StringSplitter.split(s, fi);
                assert.fail();
            } catch (e) {
                if (!e instanceof TypeError) {
                    assert.fail();
                }
            }
        });

        it ('range2()', () => {
            let s = null;
            let a = StringSplitter.range2(s, se, th);
            assert.equal(null, a);

            s = '';
            a = StringSplitter.range2(s, se, th);
            assert.equal(1, a.length);
            assert.equal('', a[0]);
            
            s = ' ';
            a = StringSplitter.range2(s, se, th);
            assert.equal(1, a.length);
            assert.equal('', a[0]);

            s = ' ';
            a = StringSplitter.range2(s, se, th, le, ri, false);
            assert.equal(1, a.length);
            assert.equal(' ', a[0]);

            s = '$';
            a = StringSplitter.range2(s, se, th);
            assert.equal(1, a.length);
            assert.equal('', a[0]);

            s = 'a$';
            a = StringSplitter.range2(s, se, th);
            assert.equal(1, a.length);
            assert.equal('a', a[0]);

            s = '$2';
            a = StringSplitter.range2(s, se, th);
            assert.equal(1, a.length);
            assert.equal('2', a[0]);

            s = 'a$ 2';
            a = StringSplitter.range2(s, se, th);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);
            a = StringSplitter.range2(s, se, th, le, ri, false);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);

            s = 'a$ 2 ';
            a = StringSplitter.range2(s, se, th);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);
            a = StringSplitter.range2(s, se, th, le, ri, false);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);

            s = ' a$ 2 ';
            a = StringSplitter.range2(s, se, th, le, ri);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);
            a = StringSplitter.range2(s, se, th, le, ri, false);
            assert.equal(1, a.length);
            assert.equal(' a2', a[0]);

            s = ' a $ 2 ';
            a = StringSplitter.range2(s, se, th);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);
            a = StringSplitter.range2(s, se, th, le, ri, false);
            assert.equal(1, a.length);
            assert.equal(' a 2', a[0]);

            s = 'a$2$c';
            a = StringSplitter.range2(s, se, th);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);

            s = 'a$2-2';
            a = StringSplitter.range2(s, se, th);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);
            s = 'a$2-3';
            a = StringSplitter.range2(s, se, th);
            assert.equal(2, a.length);
            assert.equal('a2', a[0]);
            assert.equal('a3', a[1]);
            s = 'a$2-4';
            a = StringSplitter.range2(s, se, th);
            assert.equal(3, a.length);
            assert.equal('a2', a[0]);
            assert.equal('a3', a[1]);
            assert.equal('a4', a[2]);

            s = 'a$2-3';
            a = StringSplitter.range2(s, se, th, '#');
            assert.equal(2, a.length);
            assert.equal('a#2', a[0]);
            assert.equal('a#3', a[1]);
            a = StringSplitter.range2(s, se, th, '[', ']');
            assert.equal(2, a.length);
            assert.equal('a[2]', a[0]);
            assert.equal('a[3]', a[1]);

            s = 'a$4-2';
            a = StringSplitter.range2(s, se, th);
            assert.equal(3, a.length);
            assert.equal('a4', a[0]);
            assert.equal('a3', a[1]);
            assert.equal('a2', a[2]);

            s = 1;
            try {
                a = StringSplitter.range2(s, se, th);
                assert.fail();
            } catch (e) {
                if (!e instanceof TypeError) {
                    assert.fail();
                }
            }
        });

        it ('range3()', () => {
            let s = null;
            let a = StringSplitter.range3(s, fi, se, th);
            assert.equal(null, a);

            s = '';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(1, a.length);
            assert.equal('', a[0]);
            
            s = ' ';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(1, a.length);
            assert.equal('', a[0]);

            s = ' ';
            a = StringSplitter.range3(s, fi, se, th, le, ri, false);
            assert.equal(1, a.length);
            assert.equal(' ', a[0]);

            s = ',';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(2, a.length);
            assert.equal('', a[0]);
            assert.equal('', a[1]);

            s = 'a$';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(1, a.length);
            assert.equal('a', a[0]);

            s = '$2';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(1, a.length);
            assert.equal('2', a[0]);

            s = 'a$ 2';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);
            a = StringSplitter.range3(s, fi, se, th, le, ri, false);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);

            s = 'a$ 2 ';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);
            a = StringSplitter.range3(s, fi, se, th, le, ri, false);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);

            s = ' a$ 2 ';
            a = StringSplitter.range3(s, fi, se, th, le, ri);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);
            a = StringSplitter.range3(s, fi, se, th, le, ri, false);
            assert.equal(1, a.length);
            assert.equal(' a2', a[0]);

            s = ' a $ 2 ';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);
            a = StringSplitter.range3(s, fi, se, th, le, ri, false);
            assert.equal(1, a.length);
            assert.equal(' a 2', a[0]);

            s = 'a$2$c';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);

            s = 'a$2-2';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(1, a.length);
            assert.equal('a2', a[0]);
            s = 'a$2-3';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(2, a.length);
            assert.equal('a2', a[0]);
            assert.equal('a3', a[1]);
            s = 'a$2-4';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(3, a.length);
            assert.equal('a2', a[0]);
            assert.equal('a3', a[1]);
            assert.equal('a4', a[2]);

            s = 'a$2-3';
            a = StringSplitter.range3(s, fi, se, th, '#');
            assert.equal(2, a.length);
            assert.equal('a#2', a[0]);
            assert.equal('a#3', a[1]);
            a = StringSplitter.range3(s, fi, se, th, '[', ']');
            assert.equal(2, a.length);
            assert.equal('a[2]', a[0]);
            assert.equal('a[3]', a[1]);

            s = 'a$4-2';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(3, a.length);
            assert.equal('a4', a[0]);
            assert.equal('a3', a[1]);
            assert.equal('a2', a[2]);

            s = 'a$,b';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(2, a.length);
            assert.equal('a', a[0]);
            assert.equal('b', a[1]);

            s = '$2,b';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(2, a.length);
            assert.equal('2', a[0]);
            assert.equal('b', a[1]);

            s = 'a$ 2, b';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(2, a.length);
            assert.equal('a2', a[0]);
            assert.equal('b', a[1]);
            a = StringSplitter.range3(s, fi, se, th, le, ri, false);
            assert.equal(2, a.length);
            assert.equal('a2', a[0]);
            assert.equal(' b', a[1]);

            s = 'a$ 2,b ';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(2, a.length);
            assert.equal('a2', a[0]);
            assert.equal('b', a[1]);
            a = StringSplitter.range3(s, fi, se, th, le, ri, false);
            assert.equal(2, a.length);
            assert.equal('a2', a[0]);
            assert.equal('b ', a[1]);

            s = ' a$ 2, b ';
            a = StringSplitter.range3(s, fi, se, th, le, ri);
            assert.equal(2, a.length);
            assert.equal('a2', a[0]);
            assert.equal('b', a[1]);
            a = StringSplitter.range3(s, fi, se, th, le, ri, false);
            assert.equal(2, a.length);
            assert.equal(' a2', a[0]);
            assert.equal(' b ', a[1]);

            s = ' a $ 2 , b ';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(2, a.length);
            assert.equal('a2', a[0]);
            assert.equal('b', a[1]);
            a = StringSplitter.range3(s, fi, se, th, le, ri, false);
            assert.equal(2, a.length);
            assert.equal(' a 2', a[0]);
            assert.equal(' b ', a[1]);

            s = 'a$2$c,b';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(2, a.length);
            assert.equal('a2', a[0]);
            assert.equal('b', a[1]);

            s = 'a$2-2,b';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(2, a.length);
            assert.equal('a2', a[0]);
            assert.equal('b', a[1]);
            s = 'a$2-3,b';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(3, a.length);
            assert.equal('a2', a[0]);
            assert.equal('a3', a[1]);
            assert.equal('b', a[2]);
            s = 'a$2-4,b$0-1';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(5, a.length);
            assert.equal('a2', a[0]);
            assert.equal('a3', a[1]);
            assert.equal('a4', a[2]);
            assert.equal('b0', a[3]);
            assert.equal('b1', a[4]);

            s = 'a$2-3, b$0-1 ';
            a = StringSplitter.range3(s, fi, se, th, '#');
            assert.equal(4, a.length);
            assert.equal('a#2', a[0]);
            assert.equal('a#3', a[1]);
            assert.equal('b#0', a[2]);
            assert.equal('b#1', a[3]);
            a = StringSplitter.range3(s, fi, se, th, '[', ']');
            assert.equal(4, a.length);
            assert.equal('a[2]', a[0]);
            assert.equal('a[3]', a[1]);
            assert.equal('b[0]', a[2]);
            assert.equal('b[1]', a[3]);

            s = 'a$4-2, b$0-1';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(5, a.length);
            assert.equal('a4', a[0]);
            assert.equal('a3', a[1]);
            assert.equal('a2', a[2]);
            assert.equal('b0', a[3]);
            assert.equal('b1', a[4]);

            s = 'a$4-2, b$1-0';
            a = StringSplitter.range3(s, fi, se, th);
            assert.equal(5, a.length);
            assert.equal('a4', a[0]);
            assert.equal('a3', a[1]);
            assert.equal('a2', a[2]);
            assert.equal('b1', a[3]);
            assert.equal('b0', a[4]);
            
            s = 1;
            try {
                a = StringSplitter.range3(s, fi, se, th);
                assert.fail();
            } catch (e) {
                if (!e instanceof TypeError) {
                    assert.fail();
                }
            }
        });
    });

    test.run();
}

module.exports = run;
