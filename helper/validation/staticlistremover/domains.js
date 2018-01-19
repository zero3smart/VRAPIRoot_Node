/**
 * Created by titu on 11/1/16.
 */
const dbHelper = require('../../database');
const _ = require('lodash');
const promise = require('bluebird');
const global = require('../../../config/global');
const commonHelper = require('../../common');

let remove = (results, header) => {

    let dbClient = dbHelper.dbClient;
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;
    let listOfDomains = [];
    let emailsToRemoved = [];
    let report = {};

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

    return promise.map(results, (result) => {
        listOfDomains = [];

        if (containsHeader) {
            listOfDomains = _.map(result.data, function(record) {
                return commonHelper.getEmailParts(record[emailColumnHeader]).domain;
            });
        }
        else {
            listOfDomains = _.map(result.data, function (record) {
                return commonHelper.getEmailParts(record[emailIndex]).domain;
            });
        }
        return dbClient.listCollections({name: /static_list_domains/})
            .toArray()
            .then((collections) => {
                collections = _.map(collections, 'name');

                return promise.map(collections, (collection) => {

                    return new promise(function (resolve, reject) {
                        dbClient.collection(collection).find({domain : { $ne: ""}}, {domain: 1, _id: 0})
                            .toArray(function (err, recordsInCollection) {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    console.log('Retreived ', recordsInCollection.length, ' records from ', collection);
                                    var matchedRecords = _.chain(recordsInCollection)
                                        .compact()
                                        .map(function (record, i) {
                                            if(!record.domain) {
                                                console.log('Found a domain with problem at ', i, ' : ' , record);
                                                return null;
                                            }
                                            return record.domain.toString().toLowerCase();
                                        })
                                        .intersection(listOfDomains)
                                        .value();

                                    //TODO: nedd to do a _.difference to update the result.data
                                    console.log('Got matchedRecords for collection in Static domain comparison: ' + collection + ' : '+ matchedRecords.length);
                                    resolve({matchedRecords: matchedRecords, collection: collection});
                                }
                            });
                    })
                        .then(function (queryResult) {
                            let matchedRecords = queryResult.matchedRecords;
                            emailsToRemoved = [];
                            if (!matchedRecords.length) {
                                return;
                            }

                            matchedRecords.forEach(function (domain) {
                                if (containsHeader) {
                                    _.remove(result.data, function (d) {
                                        if(commonHelper.getEmailParts(d[emailColumnHeader]).domain === domain) {
                                            emailsToRemoved.push(d[emailColumnHeader]);
                                            return true;
                                        }
                                        return false;
                                    });
                                }
                                else {
                                    _.remove(result.data, function (d) {
                                        if(commonHelper.getEmailParts(d[emailIndex]).domain === domain) {
                                            emailsToRemoved.push(d[emailIndex]);
                                            return true;
                                        }
                                        return false;
                                    });
                                }
                            });

                            result.report[collection] = emailsToRemoved;
                            listOfDomains = _.difference(listOfDomains, queryResult.matchedRecords);
                            return;
                        })
                });

            })
            .then(()=> result);
    });

};

module.exports = {
    remove: remove
};