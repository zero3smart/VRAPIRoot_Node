/**
 * Created by titu on 11/1/16.
 */

const mongoose = require('mongoose');
const dbClient = require('mongodb').MongoClient;
const config = require('../config');
const databaseSettings = config.databaseSettings;
const blueBird = require('bluebird');
//const log = require('./log');
const log = console;

let initializeDatabase = () => {
    let uriString = databaseSettings.getDatabaseUrl(databaseSettings.getDatabaseConfig());
    let connectionString = 'mongodb://' + uriString;
    mongoose.Promise = blueBird;

    log.info('Connecting to database on: ', connectionString);

    mongoose.connect(connectionString, { promiseLibrary: blueBird });

    mongoose.connection.on('connected', () => {
        log.info('Mongoose connected successfully with database.');
    });

    mongoose.connection.on('error', (error) => {
        log.error('Error in mongoose connection to database: ', error);
    });

    mongoose.connection.on('disconnected', () => {
        log.warn('Mongoose got disconnected from database.');
    });

    process.on('SIGINT', () => {
        mongoose.connection.close(() => {
            log.warn('SIGINT: Database disconnected.');
            process.exit(0);
        });
    });

    dbClient.connect(connectionString, {
        promiseLibrary: blueBird
    })
        .then((dbClient) => {
            console.log("Mongo client connected successfully with database.");
            module.exports.dbClient = dbClient;
        })
        .catch((e) => {
            console.log(e);
        });

    /*dbClient.connect(connectionString, function(err, dbClient) {
     console.log("Mongo client connected successfully with database.");
     module.exports.dbClient = dbClient;
     });*/

};

module.exports = {
    initialize: initializeDatabase
};