/**
 * Created by titu on 11/25/16.
 */
const _ = require('lodash');
const dbHelper = require('./database');
const config = require('../config');
const objectID = require('mongodb').ObjectID;

let updateStatus = (cleanId, userName, status, errorMessage) => {

    console.log('updating status for cleanId: ', cleanId, ' with: ', status);
    var now = new Date().getTime();

    var findQuery = {
        cleanId: cleanId,
        userName: userName
    };
    var updateQuery = {
        $set: {
            currentStatus: config.settings.scrubbingStatus[status]
        },
        $push: {
            history: {
                date: now,
                status: config.settings.scrubbingStatus[status]
            }
        }
    };
    var infoQuery = {
        upsert: true,
        multi: false
    };

    if(status === config.settings.scrubbingStatus.error && errorMessage) {
        updateQuery.$set.errorMessage = errorMessage;
    }

    return dbHelper.dbClient.collection('scrub_stats')
        .update(findQuery, updateQuery, infoQuery);

};

let updateSummary = (cleanId, userName, summary) => {

    console.log('updating summary for cleanId: ', cleanId);

    return dbHelper.dbClient.collection('scrub_stats')
        .update(
            {
                cleanId: cleanId,
                userName: userName
            }, {
                $set: {
                    summary: summary
                }
            }, {
                upsert: false,
                multi: false
            });
};

let getStatus = (cleanId) => {

    console.log('retrieving status for cleanId: ', cleanId);

    if (!cleanId) {
        return 'Error! cleanId is not defined.';
    }

    return dbHelper.dbClient.collection('scrub_stats')
        .findOne({cleanId: new objectID(cleanId.toString())})
        .then((scrubStats) => {
            if (scrubStats && scrubStats.currentStatus) {

                var currentStatus = _.find(scrubStats.history, function (history) {
                    return history.status === scrubStats.currentStatus;
                });

                var status = {
                    status: currentStatus.status,
                    updatedOn: currentStatus.date
                };

                if(currentStatus.status === config.settings.scrubbingStatus.completion) {
                    status.summary = scrubStats.summary;
                }
                else if(currentStatus.status === config.settings.scrubbingStatus.error) {
                    status.errorMessage = scrubStats.errorMessage;
                }
                return status;
            }
            else {
                return 'No scrubbing process found with the provided cleanId!';
            }
        });

};

module.exports = {
    updateStatus: updateStatus,
    updateSummary: updateSummary,
    getStatus: getStatus
};
