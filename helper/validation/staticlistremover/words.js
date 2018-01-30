/**
 * Created by titu on 11/1/16.
 */
const dbHelper = require('../../database');
const _ = require('lodash');
const promise = require('bluebird');
const global = require('../../../config/global');
const collection = 'static_list_badwords';

let remove = (results, header) => {

    let dbClient = dbHelper.dbClient;
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;
    let listOfEmails = [];
    let emailsToRemoved = [];

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
        return new promise(function (resolve, reject) {
            dbClient.collection(collection).find({}, {word: 1, _id: 0})
                .toArray(function (err, badWords) {
                    if (err) {
                        reject(err)
                    }
                    resolve(badWords);
                })
        })
            .then(function (badWords) {
                emailsToRemoved = [];

                if (!badWords.length) {
                    return;
                }
                badWords = _.map(badWords, 'word');

                badWords.forEach(function (badWord) {
                    if (containsHeader) {
                        _.remove(result.data, function (d) {
                            if (d[emailColumnHeader].indexOf(badWord) !== -1) {
                                emailsToRemoved.push(d[emailColumnHeader]);
                                return true;
                            }
                            return false;
                        });
                    }
                    else {
                        _.remove(result.data, function (d) {
                            if (d[emailIndex].indexOf(badWord) !== -1) {
                                emailsToRemoved.push(d[emailIndex]);
                                return true;
                            }
                            return false;
                        });
                    }
                });
                result.report.saveReports = result.report.saveReports || [];
                result.report.saveReports.push({
                    reportName: _.capitalize((collection.split('_')).pop()),
                    data: emailsToRemoved
                });

                return;
            })
            .then(()=> result);
    });

};

let search = (result) => {

    let dbClient = dbHelper.dbClient;

    return new promise(function (resolve, reject) {
        dbClient.collection(collection).find({}, {word: 1, _id: 0})
            .toArray(function (err, badWords) {
                if (err) {
                    reject(err);
                }
                else {
                    _.each(badWords, function (badWord) {
                        if (badWord.word && result.email.indexOf(badWord.word.toLowerCase()) !== -1) {
                            result.report[collection] = badWord.word;
                            result.failed = true;
                            return false;
                        }
                    });
                    resolve(result);
                }
            });
    })
        .then(()=> result);

};

module.exports = {
    remove: remove,
    search: search
};