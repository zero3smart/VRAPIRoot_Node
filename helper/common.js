/**
 * Created by titu on 11/2/16.
 */
const _ = require('lodash');
const dbHelper = require('./database');
const global = require('../config/global');

let getEmailParts = (email) => {

    var match = /(.*)@+([^.]*\.{1}\w+)((\.{1}\w+))*/g.exec(email);
    if(_.isNil(match)) {
        console.log('problem in breaking the email into parts: ' + email);
        return {
            user: null,
            domain: null,
            endings: null
        };
    }

    return {
        user: match[1],
        domain: match[2],
        endings: match[4]
    };

};

let getWhiteListedDomains = () => {
    return dbHelper.dbClient.collection('whitelisted_domains')
        .find({})
        .toArray()
        .then( (domains) => {
            return _.map(domains, 'domain');
        });
};

let getHeaderInfo = (results, header) => {
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;

    if (_.isObject(header) && header.header === true) {
        containsHeader = true;
    }
    if (containsHeader) {
        for (var key in results[0].data[0]) {
            if (_.includes(global.emailKeyNames, key.toLowerCase())) {
                emailColumnHeader = key;
                break;
            }
        }
    }
    return {
        emailIndex: emailIndex,
        emailColumnHeader: emailColumnHeader,
        containsHeader: containsHeader
    };
};

let getEmailListFromResult = (result, headerInfo) => {
    if (headerInfo.containsHeader) {
        return _.map(result.data, headerInfo.emailColumnHeader);
    }
    return _.map(result.data, function (record) {
        return record[headerInfo.emailIndex];
    });
};

module.exports = {
    getEmailParts: getEmailParts,
    getWhiteListedDomains: getWhiteListedDomains,
    getHeaderInfo: getHeaderInfo,
    getEmailListFromResult: getEmailListFromResult
};