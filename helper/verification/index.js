/**
 * Created by titu on 11/7/16.
 */

const mxHandler = require('./mx');

let start = (results, header) => {
    return mxHandler.checkEmail(results, header)
};

module.exports = {
    start: start
};