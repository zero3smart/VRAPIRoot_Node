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
                return helper.validation.start(directory, files, header);
            })
            .then((results) => {
                return helper.verification.start(results, header);
            })
            .then((result) => {
                var temp = {};

                report.endTime = new Date();
                if(!_.isArray(result)) {
                    result = [result];
                }
                result.forEach((r) => {
                    if(r.report) {
                        temp = {};
                        r.report['totalRecordsAfterClean'] = r.data.length;
                        temp[r.report.fileName] = r.report;
                        report =_.merge(report, temp);
                    }
                });

                printReport({data: result.data, report: report});
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

let printReport = (report) => {
    /*_.each(reports, (report)=>{
        console.log('------REPORT-----');
        for(var key in report) {
            console.log(key, ' : ', report[key]);
        }
    });*/
    console.log('------Report-----');
    for(var key in report) {
        console.log(key, ' : ', report[key]);
    }

};