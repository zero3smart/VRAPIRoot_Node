/**
 * Created by titu on 11/1/16.
 */
const dbHelper = require('../../database');
const _ = require('lodash');
const promise = require('bluebird');
const config = require('../../../config');
const globalSettings = config.global;
const commonHelper = require('../../common');
const log = require('../../log');

let remove = (results, header, scrubOptions) => {

    let dbClient = dbHelper.dbClient;
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;
    let listOfEndings = [];
    let emailsToRemove = [];
    let ending = null;

    if (_.isObject(header) && header.header === true) {
        containsHeader = true;
    }

    return promise.map(results, (result) => {
        listOfEndings = [];
        if (!result || !result.data.length) {
            return;
        }
        if (containsHeader) {
            for (let key in result.data[0]) {
                if (_.includes(globalSettings.emailKeyNames, key.toLowerCase())) {
                    emailColumnHeader = key;
                    break;
                }
            }
            listOfEndings = _.map(result.data, function (record) {
                ending = commonHelper.getEmailParts(record[emailColumnHeader]).endings;
                record.ending = ending;
                return ending;
            })
                .filter(function (v) {
                    return !_.isNil(v);
                });
        }
        else {
            listOfEndings = _.map(result.data, function (record) {
                ending = commonHelper.getEmailParts(record[emailIndex]).endings;
                record.ending = ending;
                return ending;
            })
                .filter(function (v) {
                    return !_.isNil(v);
                });
        }
        return dbClient.listCollections({name: /static_list_endings/})
            .toArray()
            .then((collections) => {
                collections = _.map(collections, 'name');

                return promise.map(collections, (collection) => {

                    let reportConfig = commonHelper.getReportConfig(collection);

                    if(!scrubOptions[reportConfig.paramName]) {
                        return;
                    }

                    return new promise(function (resolve, reject) {
                        dbClient.collection(collection).find({}, {ending: 1, _id: 0})
                            .toArray(function (err, recordsInCollection) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    log.info('Retreived ', recordsInCollection.length, ' records from ', collection);
                                    let matchedRecords = _.chain(recordsInCollection)
                                        .compact()
                                        .map(function (record, i) {
                                            if (!record.ending) {
                                                log.warn('Found a ending with problem at ', i, ' : ', record);
                                                return null;
                                            }
                                            return record.ending.toString().toLowerCase();
                                        })
                                        .intersection(listOfEndings)
                                        .value();

                                    //TODO: nedd to do a _.difference to update the result.data
                                    log.info('Got matchedRecords for collection in Static endings comparison: ' + collection + ' : ' + matchedRecords.length);
                                    resolve({matchedRecords: matchedRecords, collection: collection});
                                }
                            });
                    })
                        .then(function (queryResult) {
                            let matchedRecords = queryResult.matchedRecords;
                            let saveReportsData = [];
                            emailsToRemove = [];
                            result.report.saveReports = result.report.saveReports || [];

                            if (matchedRecords.length) {
                                result.data.forEach(function (email) {
                                    if (_.includes(matchedRecords, email.ending)) {
                                        if (containsHeader) {
                                            saveReportsData.push(email[emailColumnHeader]);
                                        }
                                        else {
                                            saveReportsData.push(email[emailIndex]);
                                        }

                                        emailsToRemove.push(email);
                                    }
                                });
                            }
                            result.report.saveReports.push(
                                {
                                    reportName: commonHelper.getReportName(collection),
                                    data: saveReportsData
                                }
                            );
                            log.info('Found ', emailsToRemove.length, ' emails to remove while matching with : ', queryResult.collection);
                            log.info('Before comparing with ', queryResult.collection, ' total records were: ', result.data.length);
                            result.data = _.difference(result.data, emailsToRemove);
                            log.info('After comparing with ', queryResult.collection, ' total records are: ', result.data.length);

                            listOfEndings = _.difference(listOfEndings, queryResult.matchedRecords);
                            log.info('For ', queryResult.collection, ' comparison and clean is done. returning now.');
                            return;

                        });

                }, {concurrency: 1});

            })
            .then(()=> result)
            .catch((e) => {
                log.error('ERROR CATCHED IN ENDINGS! ', e);
                throw e;
            });
    });

};

let search = (result) => {

    let dbClient = dbHelper.dbClient;
    let ending = commonHelper.getEmailParts(result.email).endings;
    if (!ending) {
        return result;
    }
    return dbClient.listCollections({name: /static_list_endings/})
        .toArray()
        .then((collections) => {
            collections = _.map(collections, 'name');

            return promise.map(collections, (collection) => {
                return new promise(function (resolve, reject) {
                    dbClient.collection(collection).findOne({
                        ending: ending
                    }, {}, function (err, match) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            if (match) {
                                result.report[collection] = match.ending;
                                result.failed = true;
                            }
                            resolve(result);
                        }
                    });
                })
            });

        })
        .then(()=> result);

};


module.exports = {
    remove: remove,
    search: search
};
