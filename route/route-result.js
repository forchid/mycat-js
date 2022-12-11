/** The result of sql statement routing, include one or 
 * multi node routes.
 * 
 * @author little-pan
 * @since 2022-12-07
 */
class RouteResult {
    
    #statement = null;
    #nodes = [];

    constructor (statement) {
        this.#statement = statement;
    }

    /** The route sql statement object. */
    get statement() {
        return this.#statement;
    }

    get nodes() {
        return this.#nodes;
    }

    get nodeCount() {
        return this.nodes.length;
    }

    addNode(node) {
        let nodes = this.#nodes;
        if (node.constructor == Array) {
            for (let elem of node) {
                elem.result = this;
                nodes.push(elem);
            }
        } else {
            node.result = this;
            nodes.push(node);
        }
        return this;
    }
    
}

module.exports = RouteResult;
