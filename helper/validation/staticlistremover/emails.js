/**
 * Created by titu on 11/1/16.
 */
const dbHelper = require('../../database');
const _ = require('lodash');
const promise = require('bluebird');
const global = require('../../../config/global');

let remove = (results, header) => {

    let dbClient = dbHelper.dbClient;
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;
    let listOfEmails = [];
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
        listOfEmails = [];

        if (containsHeader) {
            listOfEmails = _.map(result.data, emailColumnHeader);
        }
        else {
            listOfEmails = _.map(result.data, function (record) {
                return record[emailIndex];
            });
        }
        return dbClient.listCollections({name: /static_list_email/})
            .toArray()
            .then((collections) => {
                console.log(_.map(collections, 'name'));
                collections = _.map(collections, 'name');

                return promise.map(collections, (collection) => {

                    return new promise(function (resolve, reject) {
                        dbClient.collection(collection).find({
                            email: {
                                $in: listOfEmails
                            }
                        }, {email: 1, _id: 0})
                            .toArray(function (err, matchedRecords) {
                                if (err) {
                                    reject(err)
                                }
                                resolve({matchedRecords: matchedRecords, collection: collection});
                            })
                    })
                        .then(function (queryResult) {
                            if (!queryResult.matchedRecords.length) {
                                return;
                            }
                            queryResult.matchedRecords = _.map(queryResult.matchedRecords, 'email');
                            console.log(queryResult.matchedRecords);
                            emailsToRemoved = _.union(emailsToRemoved, queryResult.matchedRecords);//adding all removed emails
                            result.report[collection] = queryResult.matchedRecords;
                            listOfEmails = _.difference(listOfEmails, queryResult.matchedRecords);
                            return;
                        })
                });

            })
            .then(() => {
                emailsToRemoved.forEach(function (email) {
                    if (containsHeader) {
                        _.remove(result.data, function (d) {
                            return d[emailColumnHeader] === email;
                        });
                    }
                    else {
                        _.remove(result.data, function (d) {
                            return d[emailIndex] === email;
                        });
                    }

                });

            })
            .then(()=> result);
    });

};

module.exports = {
    remove: remove
};