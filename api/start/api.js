/**
 * Created by titu on 10/17/16.
 */

const helper = require('../../helper');
const responseHelper = helper.response;
const fileHelper = helper.file;
const searchHelper = helper.search;
const reportHelper = helper.report;
const config = require('../../config');
const commonHelper = require('../../helper/common');
const _ = require('lodash');
const promise = require('bluebird');
const jsonfile = require('jsonfile');
const Time = require('time-diff');

promise.config({
    cancellation: true
});

module.exports = {

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
            fileId: new Date().getTime(),
            userName: query.userName,
        };
        let header = query.header || {
                header: false,
                emailIndex: 0
            };
            let scrubParams = query.options || {};
        let report = {
            startTime: new Date(),
            userName: dirInfo.userName,
            fileId: dirInfo.fileId
        };

        let unKnownScrubParams = _.omitBy(scrubParams, function(value, key){return config.global.scrubOption.hasOwnProperty(key);});
        if(!_.isEmpty(unKnownScrubParams)){
            responseHelper.failure(response, {
                message: [
                    config.message.scrub_parmeter_not_supported,
                    JSON.stringify(unKnownScrubParams)
                ].join(': ')
            });
            return;
        }
        let scrubOptions = _.extend({}, config.global.scrubOption, scrubParams);

        let directory = config.global.userUploadsDir + '/' + dirInfo.userName + '/' + dirInfo.fileId;

        if (!_.isEmpty(_.pickBy(dirInfo, _.isNil))) {
            responseHelper.failure(response, {
                message: config.message.missing_parameters_service_erorr
            });
            return;
        }
        let time = new Time();
        time.start('clean');

        let steps = fileHelper.getFTPFiles(dirInfo)
            .then((files) => {
                if (files.error) {
                    responseHelper.failure(response, {
                        message: files.error
                    });
                    steps.cancel();
                    return;
                }
                else if (_.isEmpty(files)) {
                    responseHelper.failure(response, {
                        message: config.message.files_not_found_error
                    });
                    steps.cancel();
                    return;
                }
                return files;
            })
            .then((files)=> {
                return commonHelper.getReportMapper()
                    .then( (reportMapper) => {
                        config.settings.reportMapper = reportMapper;
                        return files;
                    });
            })
            .then((files) => {
                console.log('Starting validation...');
                return helper.validation.start(directory, files, header, scrubOptions);
            })
            .then((results) => {
                console.log('Starting verification...');
                return helper.verification.start(results, header, scrubOptions);
            })
            .then((result) => {
                report.endTime = new Date();
                report.totalRecordsAfterClean = 0;
                report.totalPreCleanRecords = 0;
                report.files = [];

                result.forEach((r) => {
                    if (!r) {
                        return;
                    }
                    report.totalRecordsAfterClean += r.data.length;
                    report.totalPreCleanRecords += r.report.totalRecords;
                    if (r.report) {
                        report.files.push({
                            fileName: r.report.fileName,
                            reports: r.report.saveReports,
                            totalRecords: r.report.totalRecords,
                            data: r.data
                        });
                    }
                });
                report.timeRequired = time.end('clean');

                return reportHelper.saveReports(report, directory, header);

            })
            .then(() => {
                responseHelper.success(response, {
                    report: true
                });
            })
            .catch((e) => {
                console.log(e);
                responseHelper.failure(response, {
                    message: config.message.unknown_error
                });
            });
    }
};
