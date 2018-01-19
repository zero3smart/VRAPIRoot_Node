/**
 * Created by titu on 11/7/16.
 */
const commonHelper = require('../common');
const _ = require('lodash');
const promise = require('bluebird');
const dns = promise.promisifyAll(require("dns"));

let checkEmail = (results, header) => {

    let headerInfo = commonHelper.getHeaderInfo(results, header);
    let listOfEmails = [];
    let domainsList = [];
    let failedDomains = [];

    return commonHelper.getWhiteListedDomains()
        .then((whiteListedDomains) => {

            return promise.map(results, (result) => {
                failedDomains = [];
                listOfEmails = commonHelper.getEmailListFromResult(result, headerInfo);

                domainsList = _.chain(listOfEmails)
                    .map(function (email) {
                        if (email.indexOf('@')) {
                            return email.split('@')[1];
                        }
                    })
                    .uniq()
                    .difference(whiteListedDomains).value();

                console.log('need mx check for : ' + domainsList.length + ' domain');

                return promise.map(domainsList, (domain) => {

                    return dns.resolveMxAsync(domain)
                        .then((addresses) => {

                        })
                        .catch((err) => {
                            if (err.code === 'ENOTFOUND') {
                                failedDomains.push(err.hostname);
                            }
                        });

                })
                    .then(()=> {
                        var emailsToRemoved = [];

                        if (failedDomains.length) {
                            result.report['mx'] = [];

                            _.remove(listOfEmails, function (email) {
                                if (_.includes(failedDomains, email.split('@')[1])) {
                                    if (result.report) {
                                        result.report['mx'].push(email);
                                        emailsToRemoved.push(email);
                                        return false;
                                    }
                                    return true;
                                }
                            });


                            emailsToRemoved.forEach(function (email) {
                                if (headerInfo.containsHeader) {
                                    _.remove(result.data, function (d) {
                                        return d[headerInfo.emailColumnHeader] === email;
                                    });
                                }
                                else {
                                    _.remove(result.data, function (d) {
                                        return d[headerInfo.emailIndex] === email;
                                    });
                                }

                            });
                        }
                    });


            });

        })
        .then(()=> results);
};

module.exports = {
    checkEmail: checkEmail
};