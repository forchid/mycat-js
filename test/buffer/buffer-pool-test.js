const BufferError = require('../../buffer/buffer-error');
const BufferPool = require('../../buffer/buffer-pool');
const SystemConfig = require('../../config/model/system-config');
const runIf = require('../run-if');
const co = require('coroutine');

runIf(__filename, run);

function run() {

    describe('BufferPool', () => {
        it ('create', () => {
            let pool = new BufferPool();
            assert.equal(SystemConfig.DEFAULT_BUFFER_CHUNK_SIZE, pool.chunkSize);
            assert.equal(SystemConfig.DEFAULT_BUFFER_POOL_PAGE_SIZE, pool.pageSize);
            assert.equal(SystemConfig.DEFAULT_PROCESSORS * 64, pool.pageCount);
            assert.equal(pool.pageSize * pool.pageCount, pool.totalSize);
            assert.equal(0, pool.allocated);

            pool = new BufferPool(2);
            assert.equal(2, pool.chunkSize);
            assert.equal(SystemConfig.DEFAULT_BUFFER_POOL_PAGE_SIZE, pool.pageSize);
            assert.equal(SystemConfig.DEFAULT_PROCESSORS * 64, pool.pageCount);
            assert.equal(pool.pageSize * pool.pageCount, pool.totalSize);
            assert.equal(0, pool.allocated);

            pool = new BufferPool(2, 1024);
            assert.equal(2, pool.chunkSize);
            assert.equal(1024, pool.pageSize);
            assert.equal(SystemConfig.DEFAULT_PROCESSORS * 64, pool.pageCount);
            assert.equal(pool.pageSize * pool.pageCount, pool.totalSize);
            assert.equal(0, pool.allocated);

            pool = new BufferPool(2, 1024, 10);
            assert.equal(2, pool.chunkSize);
            assert.equal(1024, pool.pageSize);
            assert.equal(10, pool.pageCount);
            assert.equal(pool.pageSize * pool.pageCount, pool.totalSize);
            assert.equal(0, pool.allocated);
        });

        it ('allocate', () => {
            let pool = new BufferPool(1024, 1024, 10);
            let buf = pool.allocate();
            assert.ok(buf instanceof Buffer);
            assert.equal(1024, buf.length);
            assert.equal(1024, pool.allocated);

            buf = pool.allocate(100);
            assert.ok(buf instanceof Buffer);
            assert.equal(1024, buf.length);
            assert.equal(1024 * 2, pool.allocated);

            buf = pool.allocate(1025);
            assert.ok(buf instanceof Buffer);
            assert.equal(1024 * 2, buf.length);
            assert.equal(1024 * 4, pool.allocated);

            buf = pool.allocate(1024 * 6);
            assert.ok(buf instanceof Buffer);
            assert.equal(1024 * 6, buf.length);
            assert.equal(1024 * 10, pool.allocated);
            assert.equal(pool.totalSize, pool.allocated);

            try {
                pool.allocate(1);
                throw new Error(`Should can't allocate again`);
            } catch (e) {
                assert.ok(e instanceof BufferError);
            }
            let ok = pool.release(buf);
            assert.ok(ok);
            buf = pool.allocate(1);
            assert.ok(buf instanceof Buffer);
            assert.equal(1024 * 1, buf.length);
            assert.equal(1024 * 5, pool.allocated);
        });

        it ('allocate await', () => {
            const sem = new co.Semaphore();
            let pool = new BufferPool(1024, 1024, 10);
            let buf = pool.allocate(1024, false, true);

            sem.acquire();
            co.start(() => {
                let buf = pool.allocate(1024 * 9, false, true);
                pool.release(buf);
                sem.release();
                // Blocked
                buf = pool.allocate(1024 * 10, true, true);
                pool.release(buf);
                sem.release();
                assert.equal(0, pool.allocated);
            });
            // wait co start
            sem.acquire();
            // release buffer for co allocating
            let ok = pool.release(buf);
            assert.ok(ok);
            // wait co OK
            sem.acquire();
            sem.release();
            assert.equal(0, pool.allocated);
        });

        it ('release', () => {
            let pool = new BufferPool(1024, 1024, 10);
            let buf = pool.allocate();
            assert.ok(buf instanceof Buffer);
            assert.equal(1024, buf.length);
            assert.equal(1024, pool.allocated);
            
            let ok = pool.release(buf);
            assert.ok(ok);
            assert.equal(0, pool.allocated);
            ok = pool.release(buf);
            assert.ok(!ok);
            assert.equal(0, pool.allocated);
        });
    });
}

module.exports = run;
