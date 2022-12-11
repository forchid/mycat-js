const Handler = require("../../handler");
const UnsupportedError = require("../../lang/unsupported-error");

class MultiNodeHandler extends Handler {

    invoke(routedQuery) {
        let { route, source } = routedQuery;
        if (route.nodeCount <= 1) {
            return routedQuery;
        }
        
        throw new UnsupportedError("Not impl");
    }

}

module.exports = MultiNodeHandler;
