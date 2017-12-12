/**
 * Created by titu on 11/4/16.
 */
/**
 * Created by titu on 11/1/16.
 */
const dbHelper = require('../../database');
const _ = require('lodash');
const promise = require('bluebird');
const global = require('../../../config/global');
const commonHelper = require('../../common');

let remove = (results, header) => {

    let dbClient = dbHelper.dbClient;
    let containsHeader = false;
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;
    let listOfEmails = [];
    let emailsToRemoved = [];
    let collection = 'static_list_roles';

    if (_.isObject(header) && header.header === true) {
        containsHeader = true;
    }

    if (containsHeader) {
        for (var key in results[0].data[0]) {
            if (_.includes(global.emailKeyNames, key.toLowerCase())) {
                emailColumnHeader = key;
                break;
            }
        }
    }

    return promise.map(results, (result) => {
        listOfEmails = [];

        if (containsHeader) {
            listOfEmails = _.map(result.data, emailColumnHeader);
        }
        else {
            listOfEmails = _.map(result.data, function (record) {
                return record[emailIndex];
            });
        }
        return new promise(function (resolve, reject) {
            dbClient.collection(collection).find({}, {role: 1, _id: 0})
                .toArray(function (err, roles) {
                    if (err) {
                        reject(err)
                    }
                    resolve(roles);
                })
        })
            .then(function (roles) {
                emailsToRemoved = [];

                if (!roles.length) {
                    return;
                }
                roles = _.map(roles, 'role');

                roles.forEach(function (role) {
                    if (containsHeader) {
                        _.remove(result.data, function (d) {
                            if(commonHelper.getEmailParts(d[emailColumnHeader]).user === role) {
                                emailsToRemoved.push(d[emailColumnHeader]);
                                return true;
                            }
                            return false;
                        });
                    }
                    else {
                        _.remove(result.data, function (d) {
                            if(commonHelper.getEmailParts(d[emailIndex]).user === role) {
                                emailsToRemoved.push(d[emailIndex]);
                                return true;
                            }
                            return false;
                        });
                    }
                });

                result.report[collection] = emailsToRemoved;
                return;
            })
            .then(()=> result);
    });

};

module.exports = {
    remove: remove
};