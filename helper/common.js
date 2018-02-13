/**
 * Created by titu on 11/2/16.
 */
const _ = require('lodash');
const dbHelper = require('./database');
const global = require('../config/global');
const csvHandler = require('./validation/csv');
const xlxHandler = require('./validation/xlx');
const config = require('../config');

let getEmailParts = (email) => {

    //var match = /(.*)@+([^.]*\.{1}\w+)((\.{1}\w+))*/g.exec(email);
    var match = /(.*)@+([^.]*\.{1}[^\..]*)((\.{1}[^\..]*))*/g.exec(email);
    if (_.isNil(match)) {
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
        .then((domains) => {
            return _.map(domains, 'domain');
        });
};

let getUserFTPConfiguration = (userName) => {
    return dbHelper.dbClient.collection('client_ftpmaster')
        .findOne({UserName: userName})
        .then((userFTPConfig) => {
            return userFTPConfig;
        });
};

let getHeaderInfo = (result, header) => {
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;

    if (_.isObject(header) && header.header === true) {
        containsHeader = true;
    }
    if (containsHeader) {
        for (var key in result.data[0]) {
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

let getFileExtension = (fileName) => {
    return fileName.split('.').pop();
};

let geFileHandler = (fileExtension) => {

    var handler = null;

    switch (fileExtension) {
        case 'txt':
        case 'csv':
        case 'tsv':
        case 'text':
            handler = csvHandler;
            break;
        case 'xlsm':
        case 'xlsx':
        case 'xls':
        case 'ods':
        case 'xlt':
            handler = xlxHandler;
            break;
    }
    return handler;
};

let isFileCompatible = (fileName) => {
    let allowedTypes = _.concat(config.settings.allowedFileTypes, config.settings.allowedZipTypes);
    return _.includes(allowedTypes, getFileExtension(fileName));
};

module.exports = {
    getEmailParts: getEmailParts,
    getWhiteListedDomains: getWhiteListedDomains,
    getHeaderInfo: getHeaderInfo,
    getEmailListFromResult: getEmailListFromResult,
    getFileExtension: getFileExtension,
    geFileHandler: geFileHandler,
    isFileCompatible: isFileCompatible,
    getUserFTPConfiguration: getUserFTPConfiguration
};