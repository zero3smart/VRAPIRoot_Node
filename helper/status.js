/**
 * Created by titu on 11/25/16.
 */
const _ = require('lodash');
const dbHelper = require('./database');
const config = require('../config');
const objectID = require('mongodb').ObjectID;

let updateStatus = (cleanId, userName, status) => {

    console.log('updating status for cleanId: ', cleanId, ' with: ', status);
    var now = new Date().getTime();

    return dbHelper.dbClient.collection('scrub_stats')
        .update(
            {
                cleanId: cleanId,
                userName: userName
            }, {
                $set: {
                    currentStatus: config.settings.scrubbingStatus[status]
                },
                $push: {
                    history: {
                        date: now,
                        status: config.settings.scrubbingStatus[status]
                    }
                }
            }, {
                upsert: true,
                multi: false
            });

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

                var status = _.find(scrubStats.history, function (history) {
                    return history.status === scrubStats.currentStatus;
                });
                return {
                    status: status.status,
                    updatedOn: status.date
                };
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
