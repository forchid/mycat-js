const SqlObject = require("./sql-object");

class SqlStatement extends SqlObject {

    #comments = [];

    constructor (source) {
        super (source);
    }

    get comments() {
        return this.#comments;
    }

    hasComment(s) {
        for (let c of this.comments) {
            if (c.sql === s) return true;
        }
        return false;
    }

    addComment(comment) {
        let a = this.#comments;
        if (comment.constructor == Array) {
            a.splice(a.length, 0, ... comment);
        } else {
            a.push(comment);
        }
    }

}

module.exports = SqlStatement;
