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
    let listOfEndings = [];
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
        listOfEndings = [];

        if (containsHeader) {
            listOfEndings = _.map(result.data, function(record) {
                return commonHelper.getEmailParts(record[emailColumnHeader]).endings;
            })
                .filter(function (v) {
                    return !_.isNil(v);
                });
        }
        else {
            listOfEndings = _.map(result.data, function (record) {
                return commonHelper.getEmailParts(record[emailIndex]).endings;
            })
                .filter(function (v) {
                    return !_.isNil(v);
                });;
        }
        return dbClient.listCollections({name: /static_list_endings/})
            .toArray()
            .then((collections) => {
                console.log(_.map(collections, 'name'));
                collections = _.map(collections, 'name');

                return promise.map(collections, (collection) => {

                    return new promise(function (resolve, reject) {
                        dbClient.collection(collection).find({
                            ending: {
                                $in: listOfEndings
                            }
                        }, {ending: 1, _id: 0})
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
                            debugger;
                            if (!matchedRecords.length) {
                                return;
                            }
                            matchedRecords = _.map(matchedRecords, 'ending');

                            matchedRecords.forEach(function (endings) {
                                if (containsHeader) {
                                    _.remove(result.data, function (d) {
                                        if(commonHelper.getEmailParts(d[emailColumnHeader]).endings === endings) {
                                            emailsToRemoved.push(d[emailColumnHeader]);
                                            return true;
                                        }
                                        return false;
                                    });
                                }
                                else {
                                    _.remove(result.data, function (d) {
                                        if(commonHelper.getEmailParts(d[emailIndex]).endings === endings) {
                                            emailsToRemoved.push(d[emailIndex]);
                                            return true;
                                        }
                                        return false;
                                    });
                                }
                            });

                            result.report[collection] = emailsToRemoved;
                            listOfEndings = _.difference(listOfEndings, queryResult.matchedRecords);
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