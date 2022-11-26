const SystemConfig = require('./config/model/system-config');
const MycatServer = require('./mycat-server');
const Logger = require('./util/logger');

const process = require('process');
const path = require('path');

class MycatStartup {

    static main(argv) {
        try {
            const home = SystemConfig.homePath;
            if (!home) {
                Logger.error("%s is not set.", SystemConfig.SYS_HOME);
                process.exit(-1);
            }
            
            const server = MycatServer.instance;
            server.startup();
            if (SystemConfig.logFileDisabled) {
                Logger.log('MyCAT Server startup successfully. Logging file disabled.');
            } else {
                const logFile = path.resolve(home, "logs", "mycat.log");
                Logger.log(`MyCAT Server startup successfully. See logs in '%s'.`, logFile);
            }
        } catch (e) {
            MycatServer.uncaught('MyCAT Server startup error', e);
            process.exit(-1);
        }
    }

}

const argv = process.argv;
MycatStartup.main(argv);
