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
                collections = _.map(collections, 'name');

                return promise.map(collections, (collection) => {

                    return new promise(function (resolve, reject) {
                        dbClient.collection(collection).find({}, {email: 1, _id: 0})
                            .toArray(function (err, recordsInCollection) {
                                if (err) {
                                    reject(err)
                                }
                                else {
                                    console.log('Retreived ', recordsInCollection.length, ' records from ', collection);
                                    var matchedRecords = _.chain(recordsInCollection)
                                        .compact()
                                        .map(function (record, i) {
                                            if(!record.email) {
                                                console.log('Found an email with problem at ', i, ' : ' , record);
                                                return null;
                                            }
                                            return record.email.toString().toLowerCase();
                                        })
                                        .intersection(listOfEmails)
                                        .value();

                                    //TODO: nedd to do a _.difference to update the result.data
                                    console.log('Got matchedRecords for collection in Static email comparison: ' + collection + ' : '+ matchedRecords.length);
                                    resolve({matchedRecords: matchedRecords, collection: collection});
                                }
                            });
                    })
                        .then(function (queryResult) {
                            if (!queryResult.matchedRecords.length) {
                                return;
                            }
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