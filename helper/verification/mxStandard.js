/**
 * Created by titu on 11/29/16.
 */

/**
 * Created by titu on 11/7/16.
 */
const commonHelper = require('../common');
const _ = require('lodash');
const promise = require('bluebird');
const settings = require('../../config/settings');
const dbHelper = require('../database');
const dnsCacheRedisHelper = require('../dnsCacheRedis');
const dns = require('dns');
const log = require('../log');

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
    let matchedRecords = [];

    return commonHelper.getWhiteListedDomains()
        .then((whiteListedDomains) => {
            log.info('whitelisteddomains: ', whiteListedDomains.length);
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

                log.info('need mx standard check for : ' + domainsList.length + ' domain');
                let checkedMx = 0;

                return promise.map(domainsList, (domain, index) => {
                    if (!domain) {
                        return;
                    }
                    ++checkedMx;
                    if (checkedMx % 1000 === 0) {
                        log.info(checkedMx / 1000 + 'K MX standard checked.');
                    }
                    return dnsCacheRedisHelper.dnsCache.lookupAsync(domain.toString())
                        .then((ip) => {
                            lookupCollection.push({
                                AdvisoryName: domain,
                                IPAddress: ip
                            });
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
                                        log.warn('timeout mx Standard check for : ', domain);
                                        break;
                                    default:
                                        log.warn(e.code, ': error for mx Standard check for : ', domain);
                                }
                            }
                            else {
                                log.error('ERROR CATCHED IN MX NESTED 3! ', e);
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
                        let lookupIps = _.map(lookupCollection, 'IPAddress');
                        let chunks = _.chunk(lookupIps, 1000);

                        log.info('Chunks created in MX Standard: ', chunks.length);
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
                                            log.info('Retreived ', matchedOnes.length, ' records from ', advisoryCollection);
                                            if (matchedOnes.length) {
                                                matchedRecords = _.concat(matchedRecords, matchedOnes);
                                            }
                                            resolve();
                                        }
                                    });
                            }).catch((e) => {
                                log.error('ERROR CATCHED IN MX STANDARD CHUNK CHECK! ', e);
                                throw e;
                            });
                        }, {concurrency: settings.concurrency})
                    })
                    .then(() => {
                        let emailsToRemoved = [];
                        let advisories = [];
                        let advisoryTraps = [];
                        let mxStandardFailed = [];
                        let match;
                        let foundAdvisory;
                        let removed = [];

                        result.report.saveReports = result.report.saveReports || [];
                        log.info('MX Standard failed number of domains: ', matchedRecords.length);
                        log.info('MX Standard failed A Records: ', failedMX.length);
                        log.info('Lookup collection length: ', lookupCollection.length);
                        log.info('LIST OF EMAILS WERE: ', listOfEmails.length);

                        if (lookupCollection.length) {
                            log.info('Starting with matching and removing against the advisory');
                            _.each(lookupCollection, function (lookup) {
                                match = _.find(matchedRecords, {'IPAddress': lookup.IPAddress});
                                if (match) {
                                    foundAdvisory = _.find(advisories, _.matchesProperty('name', match.AdvisoryName));
                                    if (!foundAdvisory) {
                                        advisories.push({
                                            name: match.AdvisoryName,
                                            value: 1
                                        });
                                    }
                                    else {
                                        ++foundAdvisory.value;
                                    }
                                    removed = _.remove(listOfEmails, function (email) {
                                        if (email.split('@')[1] == lookup.AdvisoryName) {
                                            advisoryTraps.push([email, match.AdvisoryName]);
                                            emailsToRemoved.push(email);
                                            return true;
                                        }
                                        else {
                                            return false;
                                        }
                                    });
                                    log.info('Removed: ', removed.length);
                                    removed = [];
                                }
                            })
                        }

                        log.info('Advisory Traps: ', advisoryTraps.length);
                        log.info('LIST OF EMAILS ARE: ', listOfEmails.length);
                        log.info('EMAILS TO REMOVED: ', emailsToRemoved.length);

                        _.remove(listOfEmails, function (email) {
                            if (_.includes(failedMX, email.split('@')[1])) {
                                mxStandardFailed.push(email);
                                return true;
                            }
                            else {
                                return false;
                            }
                        });
                        log.info('MX STANDARD FAILED: ', mxStandardFailed.length);
                        emailsToRemoved = _.concat(emailsToRemoved, mxStandardFailed);
                        log.info('Now emailsToRemoved: ', emailsToRemoved.length);
                        log.info('listOfEmails now: ', listOfEmails.length);

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
                    log.info('MX Standard check completed.')
                    return results;
                })
                .catch((e) => {
                    log.error('ERROR CATCHED IN MX Standard NESTED 2! ', e);
                    throw e;
                });


        })
        .catch((e) => {
            log.error('ERROR CATCHED IN MX Standard NESTED 1! ', e);
            throw e;
        });
};
module.exports = {
    checkEmail: checkEmail
};
