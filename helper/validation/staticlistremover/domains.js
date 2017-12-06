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
                console.log(_.map(collections, 'name'));
                collections = _.map(collections, 'name');

                return promise.map(collections, (collection) => {

                    return new promise(function (resolve, reject) {
                        dbClient.collection(collection).find({
                            domain: {
                                $in: listOfDomains
                            }
                        }, {domain: 1, _id: 0})
                            .toArray(function (err, matchedRecords) {
                                if (err) {
                                    reject(err)
                                }
                                resolve({matchedRecords: matchedRecords, collection: collection});
                            })
                    })
                        .then(function (queryResult) {
                            let matchedRecords = queryResult.matchedRecords;
                            emailsToRemoved = [];
                            if (!matchedRecords.length) {
                                return;
                            }
                            matchedRecords = _.map(matchedRecords, 'domain');

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