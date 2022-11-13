const SystemConfig = require("../../config/model/system-config");
const test = require('test');

test.setup();
assert.equal(false, SystemConfig.logFileDisabled);
SystemConfig.resetLogger();
console.log('OK');
