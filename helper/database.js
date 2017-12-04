/**
 * Created by titu on 11/1/16.
 */

const mongoose = require('mongoose');
const config = require('../config');
const databaseSettings = config.databaseSettings;
const blueBird = require('bluebird');
//const log = require('./log');
const log = console;

let initializeDatabase = () => {
    let uriString = databaseSettings.getDatabaseUrl(databaseSettings.getDatabaseConfig());

    mongoose.Promise = blueBird;

    log.info('Connecting to database on: ', uriString);
    mongoose.connect('mongodb://' + uriString, { promiseLibrary: blueBird });

    mongoose.connection.on('connected', () => {
        log.info('Database connected!');
    });

    mongoose.connection.on('error', (error) => {
        log.error('Error in Database connection: ', error);
    });

    mongoose.connection.on('disconnected', () => {
        log.warn('Database disconnected.');
    });

    process.on('SIGINT', () => {
        mongoose.connection.close(() => {
            log.warn('SIGINT: Database disconnected.');
            process.exit(0);
        });
    });
};

module.exports = {
    initialize: initializeDatabase
};