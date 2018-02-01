/**
 * Created by titu on 10/17/16.
 */

const helper = require('../../helper');
const responseHelper = helper.response;
const fileHelper = helper.file;
const zipHelper = helper.zip;
const searchHelper = helper.search;
const reportHelper = helper.report;
const config = require('../../config');
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
            fileId: query.fileId,
            userName: query.userName,
        };
        let header = query.header || {};
        let report = {
            startTime: new Date(),
            userName: query.userName,
            fileId: query.fileId
        };
        let directory = config.global.userUploadsDir + '/' + dirInfo.userName + '/' + dirInfo.fileId;

        if (_.isEmpty(_.omitBy(dirInfo, _.isUndefined))) {
            responseHelper.failure(response, {
                message: config.message.missing_parameters_service_erorr
            });
            return;
        }
        let time = new Time();
        time.start('clean');
        let steps = fileHelper.prepareFiles(directory)
            .then((files) => {
                if (_.isEmpty(files)) {
                    responseHelper.failure(response, {
                        message: config.message.files_not_found_error
                    });
                    steps.cancel();
                    return;
                }
                return files;
            })
            .then((files) => {
                console.log('Starting validation...');
                return helper.validation.start(directory, files, header);
            })
            .then((results) => {
                console.log('Starting verification...');
                return helper.verification.start(results, header);
            })
            .then((result) => {
                report.endTime = new Date();
                report.totalRecordsAfterClean = 0;
                report.totalPreCleanRecords = 0;
                report.files = [];

                result.forEach((r) => {
                    report.totalRecordsAfterClean += r.data.length;
                    console.log('r.report.totalRecords: ', r.report.totalRecords);
                    report.totalPreCleanRecords += r.report.totalRecords;
                    //report.data = _.concat(report.data, r.data);
                    if(r.report) {
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
            });
    },

    zip: (request, response) => {

        zipHelper.zip(config.global.userUploadsDir + '/1476795850851', new Date().getTime().toString() + '.zip', 'zip', function (err) {
            if (err) {
                responseHelper.failure(response, err);
            }
            else {
                responseHelper.success(response, 'Done');
            }
        });

    }
};