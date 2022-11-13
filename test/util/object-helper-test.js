const ObjectHelper = require('../../util/object-helper');
const runIf = require('../run-if');

runIf(__filename, run);

function run() {
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
}

module.exports = run;
