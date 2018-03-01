/**
 * Created by titu on 11/7/16.
 */

const mxHandler = require('./mx');

let start = (results, header, scrubOptions) => {
    console.log('starting with mxHandler.checkEmail...');
    if(scrubOptions.mxOnly) {
        return mxHandler.checkEmail(results, header);
    }
    else {
        return results;
    }
};

module.exports = {
    start: start
};
