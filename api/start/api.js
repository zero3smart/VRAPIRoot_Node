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
        console.log('----- REQUEST FOUND -----');
        console.log('params: ');
        console.log(request.query);
        console.log('Cleaning started at: ' + new Date());

        let query = request.query || {};
        let dirInfo = {
            fileId: query.fileId,
            userName: query.userName,
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
            .then(() => {
                console.log('Cleaning completed at: ' + new Date());
                responseHelper.success(response, {
                    msg: 'Cleaning completed'
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
