/**
 * Created by titu on 11/7/16.
 */

const mxHandler = require('./mx');

let start = (results, header) => {
    console.log('starting with mxHandler.checkEmail...');
    return mxHandler.checkEmail(results, header)
};

module.exports = {
    start: start
};