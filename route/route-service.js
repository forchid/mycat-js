const RouteNode = require("./route-node");
const RouteResult = require("./route-result");

/** The route service of sql statement.
 * 
 * @author little-pan
 * @since 2022-12-07
 */
class RouteService {

    route(statement, charset, serverConn, sysConfig, schemaConfig) {
        let result = new RouteResult(statement);
        
        // TODO more route strategies
        // Default route
        let dataNode = schemaConfig.dataNode;
        let node = new RouteNode(dataNode, statement);
        result.addNode(node);

        return result;
    }

}

module.exports = RouteService;
