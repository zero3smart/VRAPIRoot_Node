/**
 * Created by titu on 11/1/16.
 */
const emails = require('./emails');
const domains = require('./domains');
const endings = require('./endings');
const words = require('./words');
const dbHelper = require('../../database');
const _ = require('lodash');
const promise = require('bluebird');
const global = require('../../../config/global');


let getStaticEmailsCollection = (result) => {

    let dbClient = dbHelper.dbClient;

    return dbClient.listCollections({name: /static_list_emails/})
        .toArray()
        .then((collections) => {
            console.log(_.map(collections, 'name'));
            //return
            collections = _.map(collections, 'name');
            debugger;
            return promise.map(collections, (collection) => {
                return dbClient.collection(collection).find({email: "botclicker1@yahoo.com"})
                    .toArray()
            })
                .each(function (matchedRecords) {
                    // This is repeating access for each result
                    console.log(matchedRecords)
                })
                .then(()=> result);
        });
    //console.log(dbCollections);
//db.getCollectionNames().filter(function (collection) { return /pattern/.test(collection) })
//http://stackoverflow.com/questions/5794834/how-to-access-a-preexisting-collection-with-mongoose


    /*var mongoose = require("mongoose");
     mongoose.connect('mongodb://localhost/local');

     var connection = mongoose.connection;

     connection.on('error', console.error.bind(console, 'connection error:'));
     connection.once('open', function () {

     connection.db.collection("YourCollectionName", function(err, collection){
     collection.find({}).toArray(function(err, data){
     console.log(data); // it will print your collection data
     })
     });

     });*/

};

let removeStaticListEmails = (results, header) => {

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
    getStaticEmailsCollection: getStaticEmailsCollection,
    removeStaticListEmails: removeStaticListEmails
};