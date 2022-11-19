const ConfigInitializer = require("./config-initializer");

class MycatConfig {

    constructor() {
        let loadDataHost = true;
        let confInit = new ConfigInitializer({ loadDataHost });
    }
    
}

module.exports = MycatConfig;
