/**
 * Created by titu on 10/17/16.
 */

const responseHelper = require('../../helper').response;
const helper = require('../../helper');
const fileHelper = helper.file;
const zipHelper = helper.zip;
const config = require('../../config');
const _ = require('lodash');
const promise = require('bluebird');

promise.config({
    cancellation: true
});

module.exports = {

    clean: (request, response) => {
        console.log('----- REQUEST RECEIVED -----');
        console.log('params: ');
        console.log(request.query);

        let query = request.query || {};
        let dirInfo = {
            fileId: query.fileId,
            userName: query.userName,
        };
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
                return helper.validation.start(directory, files);
            })
            .then((result) => {
                report.endTime = new Date();
                if(_.isArray(result)) {
                    result = result[0];
                }
                if(result.report) {
                    report =_.merge(report, result.report);
                }
                printReport([report]);
                responseHelper.success(response, {
                    report: report
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

let printReport = (reports) => {
    _.each(reports, (report)=>{
        console.log('------REPORT-----');
        for(var key in report) {
            console.log(key, ' : ', report[key]);
        }
    });

};