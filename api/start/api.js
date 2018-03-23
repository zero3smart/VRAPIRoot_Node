/**
 * Created by titu on 10/17/16.
 */

const helper = require('../../helper');
const responseHelper = helper.response;
const searchHelper = helper.search;
const config = require('../../config');
const _ = require('lodash');
const promise = require('bluebird');
const jsonfile = require('jsonfile');
const apiHelper = helper.api;
const Time = require('time-diff');
const objectID = require('mongodb').ObjectID;

promise.config({
    cancellation: true
});

module.exports = {

    status: (request, response) => {
        let cleanId = request.query.cleanId;

        if (_.isNil(cleanId)) {
            responseHelper.failure(response, {
                message: config.message.missing_parameters_service_erorr
            });
            return;
        }
        apiHelper.getStatus(cleanId)
            .then((status) => {
                responseHelper.success(response, status);
            });
    },
    search: (request, response) => {
        let time = new Time();
        let email = request.query.email;

        if (_.isNil(email)) {
            responseHelper.failure(response, {
                message: config.message.missing_parameters_service_erorr
            });
            return;
        }
        time.start('search');
        searchHelper.startSearch(email)
            .then((result) => {
                result.timeRequired = time.end('search');
                responseHelper.success(response, result);
            });
    },
    clean: (request, response, params) => {
        console.log('----- REQUEST RECEIVED -----');
        console.log('params: ');
        console.log(request.body);

        let query = request.body || {};
        let dirInfo = {
            fileName: query.fileName,
            cleanId: new objectID(),
            userName: query.userName,
        };
        let header = query.header || {
                header: false,
                emailIndex: 0
            };
        let scrubParams = query.options || {};
        let report = {
            startTime: new Date().getTime(),
            userName: dirInfo.userName,
            cleanId: dirInfo.cleanId
        };

        let unKnownScrubParams = _.omitBy(scrubParams, function (value, key) {
            return config.global.scrubOption.hasOwnProperty(key);
        });
        if (!_.isEmpty(unKnownScrubParams)) {
            responseHelper.failure(response, {
                message: [
                    config.message.scrub_parmeter_not_supported,
                    JSON.stringify(unKnownScrubParams)
                ].join(': ')
            });
            return;
        }
        let scrubOptions = _.extend({}, config.global.scrubOption, scrubParams);

        let directory = config.global.userUploadsDir + '/' + dirInfo.userName + '/' + dirInfo.cleanId;

        if (!_.isEmpty(_.pickBy(dirInfo, _.isNil))) {
            responseHelper.failure(response, {
                message: config.message.missing_parameters_service_erorr
            });
            return;
        }
        let time = new Time();
        time.start('clean');

        console.log('#1. Fetching FTP files');
        let steps = apiHelper.getFTPFiles(dirInfo, response)
            .then((files) => {
                return apiHelper.validateFiles(files, steps);
            })
            .then((files)=> {
                console.log('#2. Loading Report Mapper.');
                return apiHelper.loadReportMapper(dirInfo, files);
            })
            .then((files) => {
                console.log('#3. Starting Validation');
                return apiHelper.startValidation(directory, files, header, scrubOptions, dirInfo);
            })
            .then((results) => {
                console.log('#4. Starting Verification');
                return helper.verification.start(results, header, scrubOptions);
            })
            .then((result) => {
                console.log('# 5. Saving Reports');
                return apiHelper.saveReports(result, report, directory, time, header);
            })
            .then((finalReport) => {
                console.log('# 6. Sending Response');
                return apiHelper.sendResponse(finalReport, response, dirInfo);
            })
            .catch((e) => {
                console.log('ERROR CATCHED IN API STEPS!');
                console.log(e);
                responseHelper.failure(response, {
                    message: config.message.unknown_error
                });
            });
    }
};
