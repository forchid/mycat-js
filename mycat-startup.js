const SystemConfig = require('./config/model/system-config');
const MycatServer = require('./mycat-server');

const process = require('process');
const path = require('path');

class MycatStartup {

    static main(argv) {
        try {
            const home = SystemConfig.homePath;
            if (!home) {
                console.error("%s is not set.", SystemConfig.SYS_HOME);
                process.exit(-1);
            }
        
            const server = MycatServer.instance;
            server.startup();
            if (SystemConfig.logFileDisabled) {
                console.log('MyCAT Server startup successfully. Logging file disabled.');
            } else {
                const logFile = path.resolve(home, "logs", "mycat.log");
                console.log('MyCAT Server startup successfully. See logs in %s', logFile);
            }
        } catch (e) {
            if (e.stack) console.error(`MyCAT Server startup error: \n${e.stack}`);
            else console.error('MyCAT Server startup error: %s', e);
            process.exit(-1);
        }
    }

}

const argv = process.argv;
MycatStartup.main(argv);
