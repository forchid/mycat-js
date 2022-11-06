const SystemConfig = require('./config/system-config');

const process = require('process');
const path = require('path');

main();

function main() {
    const home = SystemConfig.getHomePath();
    if (!home) {
        console.error("%s is not set.", SystemConfig.SYS_HOME);
        process.exit(-1);
    }

    if (SystemConfig.logFileDisabled) {
        console.log('MyCAT Server startup successfully. Logging file disabled.');
    } else {
        const logFile = path.resolve(home, "logs", "mycat.log");
        console.log('MyCAT Server startup successfully. See logs in %s', logFile);
    }
    SystemConfig.resetLogger();

    console.log("Bye!");
}
