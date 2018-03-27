/**
 * Created by titu on 11/29/16.
 */

/**
 * Created by titu on 11/7/16.
 */
const commonHelper = require('../common');
const _ = require('lodash');
const promise = require('bluebird');
const dns = promise.promisifyAll(require("dns"));
const settings = require('../../config/settings');
const dbHelper = require('../database');
const dnscache = require('dnscache')({
    "enable": true,
    "ttl": 300,
    "cachesize": 5000000
});

let checkEmail = (results, header) => {
    let dbClient = dbHelper.dbClient;
    let headerInfo = null;
    let listOfEmails = [];
    let domainsList = [];
    let failedDomains = [];
    let dnsServers = dns.getServers();
    let lookupCollection = [];
    let failedMX = [];
    let advisoryCollection = 'advisorymaster';
    var matchedRecords = [];

    return commonHelper.getWhiteListedDomains()
        .then((whiteListedDomains) => {
            console.log('whitelisteddomains: ', whiteListedDomains.length);
            return promise.map(results, (result) => {
                if (!result || !result.data.length) {
                    return;
                }
                headerInfo = commonHelper.getHeaderInfo(result, header);
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

                console.log('need mx standard check for : ' + domainsList.length + ' domain');
                var checkedMx = 0;

                return promise.map(domainsList, (domain, index) => {
                    if (!domain) {
                        return;
                    }
                    ++checkedMx;
                    if (checkedMx % 1000 === 0) {
                        console.log(checkedMx / 1000 + 'K MX standard checked.');
                    }
                    return dnscache.lookupAsync(domain.toString())
                        .then((ip) => {
                            lookupCollection.push({
                                AdvisoryName: domain,
                                IPAddress: ip
                            })
                            return;
                        })
                        .catch((e) => {
                            if (e.code) {
                                switch (e.code) {
                                    case 'ENOTFOUND':
                                    case 'ENODATA':
                                    case 'ESERVFAIL':
                                        failedMX.push(domain);
                                        break;
                                    case 'ETIMEOUT':
                                        console.log('timeout mx Standard check for : ', domain);
                                        break;
                                    default:
                                        console.log(e.code, ': error for mx Standard check for : ', domain);
                                }
                            }
                            else {
                                console.log('ERROR CATCHED IN MX NESTED 3!');
                                console.log(e);
                                throw e;
                            }
                        });

                }, {
                    concurrency: dnsServers.length
                })
                    .then(() => {
                        if (!lookupCollection) {
                            return;
                        }
                        var lookupIps = _.map(lookupCollection, 'IPAddress');
                        var chunks = _.chunk(lookupIps, 1000);

                        console.log('Chunks created in MX Standard: ', chunks.length);
                        return promise.map(chunks, function (chunk) {
                            return new promise(function (resolve, reject) {
                                dbClient.collection(advisoryCollection).find({
                                    IPAddress: {
                                        $in: chunk
                                    }
                                }, {})
                                    .toArray(function (err, matchedOnes) {
                                        if (err) {
                                            reject(err);
                                        }
                                        else {
                                            console.log('Retreived ', matchedOnes.length, ' records from ', advisoryCollection);
                                            if (matchedOnes.length) {
                                                matchedRecords = _.concat(matchedRecords, matchedOnes);
                                            }
                                            resolve();
                                        }
                                    });
                            }).catch((e) => {
                                console.log('ERROR CATCHED IN MX STANDARD CHUNK CHECK!');
                                console.log(e);
                                throw e;
                            });
                        }, {concurrency: settings.concurrency})
                    })
                    .then(()=> {
                        var emailsToRemoved = [];
                        var advisories = {};//should be a list of key/value
                        var advisoryTraps = [];
                        var mxStandardFailed = [];
                        var match;

                        result.report.saveReports = result.report.saveReports || [];
                        console.log('MX Standard failed number of domains: ', matchedRecords.length);
                        console.log('MX Standard failed A Records: ', failedMX.length);
                        console.log('Sample Matched Data: ');
                        console.log(matchedRecords[0])

                        console.log('LIST OF EMAILS WERE: ', listOfEmails.length);
                        if (lookupCollection.length) {
                            _.each(lookupCollection, function (lookup) {
                                match = _.find(matchedRecords, {'IPAddress': lookup.IPAddress})
                                if (match) {
                                    if (!advisories[match.AdvisoryName]) {
                                        advisories[match.AdvisoryName] = 1;
                                    }
                                    else {
                                        ++advisories[match.AdvisoryName];
                                    }
                                    _.remove(listOfEmails, function (email) {
                                        if (email.split('@')[1] == lookup.AdvisoryName) {
                                            advisoryTraps.push([email, match.AdvisoryName]);
                                            emailsToRemoved.push(email);
                                            return true;
                                        }
                                        else {
                                            return false;
                                        }
                                    });

                                }
                            })
                        }

                        console.log('Advisory Traps: ', advisoryTraps.length);
                        console.log('LIST OF EMAILS ARE: ', listOfEmails.length);
                        console.log('EMAILS TO REMOVED: ', emailsToRemoved.length);

                        _.remove(listOfEmails, function (email) {
                            if (_.includes(failedMX, email.split('@')[1])) {
                                mxStandardFailed.push(email);
                                return true;
                            }
                            else {
                                return false;
                            }
                        });
                        console.log('MX STANDARD FAILED: ', mxStandardFailed.length);
                        emailsToRemoved = _.concat(emailsToRemoved, mxStandardFailed);
                        console.log('Now emailsToRemoved: ', emailsToRemoved.length);
                        console.log('listOfEmails now: ', listOfEmails.length);

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

                        result.report.saveReports.push(
                            {
                                reportName: 'Advisory Traps',
                                data: advisoryTraps,
                                intact: true,
                                detailReport: advisories

                            }
                        );
                        result.report.saveReports.push(
                            {
                                reportName: 'A record',
                                data: mxStandardFailed
                            }
                        );
                    });
            })
                .then(() => {
                    return results;
                })
                .catch((e) => {
                    console.log('ERROR CATCHED IN MX Standard NESTED 2!');
                    console.log(e);
                    throw e;
                });


        })
        .catch((e) => {
            console.log('ERROR CATCHED IN MX Standard NESTED 1!');
            console.log(e);
            throw e;
        });
};
module.exports = {
    checkEmail: checkEmail
};
