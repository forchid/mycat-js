const runIf = require("../run-if");
const CoHelper = require("../../util/co-helper");
const co = require("coroutine");

runIf(__filename, run);

function run() {

    describe("CoHelper", () => {
        it ("test name", () => {
            const old = CoHelper.name;
            try {
                CoHelper.name = "main";

                let child = co.start(() => {
                    assert.equal("main", CoHelper.name);
                    CoHelper.name = "child";
                });
                
                assert.equal("main", CoHelper.name);
                child.join();
                assert.equal("child", child.name);
                assert.equal("main", CoHelper.name);
            } finally {
                CoHelper.name = old;
            }
        });
    });

}

module.exports = run;
