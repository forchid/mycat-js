const ObjectHelper = require('../../util/object-helper');
const runIf = require('../run-if');

const test = require('test');

runIf(__filename, run);

function run() {
    test.setup();

    const Cat = require('./cat');

    describe('ObjectHelper', () => {
        it('loadClass()', () => {
            let MyCat = ObjectHelper.loadClass('test/util/cat');
            assert.equal(Cat, MyCat);
        });

        it ('create()', () => {
            let cp = 'test/util/cat';
            let cat = ObjectHelper.create(cp);
            assert.equal('mycat', cat.name);
            assert.equal(10, cat.age);
            cat.meow();

            cat = ObjectHelper.create(cp, false);
            assert.equal('', cat.name);
            assert.equal(0, cat.age);
            cat.meow();

            cp = '../test/util/cat';
            cat = ObjectHelper.create(cp);
            assert.equal('mycat', cat.name);
            assert.equal(10, cat.age);
            cat.meow();

            cp = 'io.mycat.test.util.Cat';
            cat = ObjectHelper.create(cp);
            assert.equal('mycat', cat.name);
            assert.equal(10, cat.age);
            cat.meow();

            cat = ObjectHelper.create(cp, false);
            assert.equal('', cat.name);
            assert.equal(0, cat.age);
            cat.meow();
        });
    });

    test.run();
}

module.exports = run;
