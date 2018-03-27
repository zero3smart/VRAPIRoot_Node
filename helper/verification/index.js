/**
 * Created by titu on 11/7/16.
 */

const mxOnlyHandler = require('./mxOnly');
const mxStandardHandler = require('./mxStandard');
const promise = require('bluebird');

let start = (results, header, scrubOptions) => {
    return new promise(function (resolve, reject) {
        resolve();
    })
        .then(() => {
            return startMXOnly(results, header, scrubOptions)
        })

        .then(() => {
            return startMXStandard(results, header, scrubOptions);
        });
};

let startMXOnly = (results, header, scrubOptions) => {

    if (scrubOptions.mxOnly) {
        console.log('starting with mxOnlyHandler.checkEmail...');
        return mxOnlyHandler.checkEmail(results, header);
    }
    else {
        return results;
    }
};

let startMXStandard = (results, header, scrubOptions) => {
    if (scrubOptions.mxStandard) {
        console.log('starting with mxStandardHandler.checkEmail...');
        return mxStandardHandler.checkEmail(results, header);
    }
    else {
        return results;
    }
};

module.exports = {
    start: start
};
