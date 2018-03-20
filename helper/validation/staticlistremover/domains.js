/**
 * Created by titu on 11/1/16.
 */
const dbHelper = require('../../database');
const _ = require('lodash');
const promise = require('bluebird');
const global = require('../../../config/global');
const commonHelper = require('../../common');

let remove = (results, header, scrubOptions) => {

    let dbClient = dbHelper.dbClient;
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;
    let listOfDomains = [];
    let emailsToRemove = [];
    let domain = null;

    if (_.isObject(header) && header.header === true) {
        containsHeader = true;
    }

    return promise.map(results, (result) => {
        listOfDomains = [];
        if (!result || !result.data.length) {
            return;
        }
        if (containsHeader) {
            for (var key in result.data[0]) {
                if (_.includes(global.emailKeyNames, key.toLowerCase())) {
                    emailColumnHeader = key;
                    break;
                }
            }
            listOfDomains = _.map(result.data, function (record) {
                domain = commonHelper.getEmailParts(record[emailColumnHeader]).domain;
                record.domain = domain;
                return domain;
            });
        }
        else {
            listOfDomains = _.map(result.data, function (record) {
                domain = commonHelper.getEmailParts(record[emailIndex]).domain;
                record.domain = domain;
                return domain;
            });
        }
        return dbClient.listCollections({name: /static_list_domains/})
            .toArray()
            .then((collections) => {
                collections = _.map(collections, 'name');

                return promise.map(collections, (collection) => {

                    let reportConfig = commonHelper.getReportConfig(collection);

                    if(!scrubOptions[reportConfig.paramName]) {
                        return;
                    }

                    return new promise(function (resolve, reject) {
                        dbClient.collection(collection).find({domain: {$ne: ""}}, {domain: 1, _id: 0})
                            .toArray(function (err, recordsInCollection) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    console.log('Retreived ', recordsInCollection.length, ' records from ', collection);
                                    var matchedRecords = _.chain(recordsInCollection)
                                        .compact()
                                        .map(function (record, i) {
                                            if (!record.domain) {
                                                console.log('Found a domain with problem at ', i, ' : ', record);
                                                return null;
                                            }
                                            return record.domain.toString().toLowerCase();
                                        })
                                        .intersection(listOfDomains)
                                        .value();

                                    //TODO: nedd to do a _.difference to update the result.data
                                    console.log('Got matchedRecords for collection in Static domain comparison: ' + collection + ' : ' + matchedRecords.length);
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
                                    if (_.includes(matchedRecords, email.domain)) {
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

                            console.log('Found ', emailsToRemove.length, ' emails to remove while matching with : ', queryResult.collection);
                            console.log('Before comparing with ', queryResult.collection, ' total records were: ', result.data.length);
                            result.data = _.difference(result.data, emailsToRemove);
                            console.log('After comparing with ', queryResult.collection, ' total records are: ', result.data.length);

                            listOfDomains = _.difference(listOfDomains, queryResult.matchedRecords);
                            console.log('For ', queryResult.collection, ' comparison and clean is done. returning now.');
                            return;
                        })
                });

            })
            .then(()=> result)
            .catch((e) => {
                console.log('ERROR CATCHED IN DOMAINS!');
                console.log(e);
                throw e;
            });
    });

};

let search = (result) => {

    let dbClient = dbHelper.dbClient;
    let domain = commonHelper.getEmailParts(result.email).domain;

    return dbClient.listCollections({name: /static_list_domains/})
        .toArray()
        .then((collections) => {
            collections = _.map(collections, 'name');

            return promise.map(collections, (collection) => {
                return new promise(function (resolve, reject) {
                    dbClient.collection(collection).findOne({
                        domain: domain
                    }, {}, function (err, match) {
                        if (err) {
                            reject(err);
                        }
                        else {
                            if (match) {
                                result.report[collection] = match.domain;
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
