/**
 * Created by titu on 10/25/16.
 */
const commonHelper = require('../common');
const settings = require('../../config').settings;
const fuzzyMatching = require('fuzzy-matching');
const _ = require('lodash');
const global = require('../../config/global');

let getFuzzyMatcherDomains = () => {
    return commonHelper.getWhiteListedDomains();
};

let lengthCheck = (email) => {
    return email.length <= settings.allowedEmailLength;
};

let spaceCharacterCheck = (email) => {
    var trimmed = _.trim(email);
    return email.length === trimmed.length;
};

let numOfDotOccurencesCheck = (email) => {
    var numberOfDots = (email.match(/\./g) || []).length;
    return numberOfDots <= settings.allowedNumOfDots;
};

let numOfAtTheRateOfOccurencesCheck = (email) => {
    var numberOfAtTheRateOf = (email.match(/@/g) || []).length;
    return numberOfAtTheRateOf <= settings.allowedNumOfAtTheRateOf;
};

let specialCharacterCheck = (email) => {
    var numOfSpecialCharacters = (email.match(/[!#$%^&*()+={}|\[\]\\:”";’'<>?,/]/g) || []).length;
    return numOfSpecialCharacters === 0;
};

let asciiCharacterCheck = (email) => {
    var numOfAsciiCharacters = (email.match(/[ ¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»\¼½¾¿]/g) || []).length;
    return numOfAsciiCharacters === 0;
};

let botAddressCheck = (email) => {
    //TODO:: commenting out now as the following regular expression isn't working and need clarification from James

    /*var regex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/g;

    return regex.test(email);*/
    return true;
};

let fixMisSpelled = (email, fuzzyMatch) => {
    var domain = (email.split('@')).pop();
    var fixedSpelling = fuzzyMatch.get(domain, { maxChanges: 2 }).value;

    if(fixedSpelling) {
        email = email.replace(domain, fixedSpelling);
    }
    return email;
};

let fixLatinCharacters = (email) => {
    var matches_array = email.match(global.latinCapitalLettersRegex);

    if(matches_array && matches_array.length) {
        matches_array.forEach((match) => {
            email = email.replace(match, global.latingEnglishMapper[match.toUpperCase()]);
        });
    }
    return email;
};

let validate = (result, header) => {
    return getFuzzyMatcherDomains()
        .then((domains) => {
            return {
                result: result,
                header: header,
                fuzzyMatch: new fuzzyMatching(domains)
            };
        })
        .then( (params) => {
            return validateSyntax(params.result, params.header, params.fuzzyMatch);
        });
};

let validateSyntax = (result, header, fuzzyMatch) => {
    var dataCollection = result.data;
    var clearedEmails = [];
    var email = null;
    var report = {
        "LongEmails": [],
        "SyntaxErrors": [],
        "Seeds": [],
        "FixedMisSpelledDomains": [],
        "FixedLatinLetters": []
    };
    var fixedMisSpelledEmail = null;
    var fixedLatinEmail = null;
    var containsHeader = false;
    if (_.isObject(header) && header.header === true) {
        containsHeader = true;
    }
    let emailIndex = header.emailIndex || 0;
    let emailColumnHeader = null;

    if (containsHeader) {
        for (var key in dataCollection[0]) {
            if (_.includes(global.emailKeyNames, key.toLowerCase())) {
                emailColumnHeader = key;
                break;
            }
        }
    }
    dataCollection.forEach((data)=> {
        if(containsHeader) {
            email = data[emailColumnHeader];
        }
        else {
            email = data[emailIndex];
        }

        if (!lengthCheck(email)) {
            report.LongEmails.push(email);
            return;
        }
        else if (!spaceCharacterCheck(email)) {
            report.SyntaxErrors.push(email);
            return;
        }
        else if (!numOfDotOccurencesCheck(email)) {
            report.SyntaxErrors.push(email);
            return;
        }
        else if (!numOfAtTheRateOfOccurencesCheck(email)) {
            report.SyntaxErrors.push(email);
            return;
        }
        else if (!specialCharacterCheck(email)) {
            report.SyntaxErrors.push(email);
            return;
        }
        else if (!asciiCharacterCheck(email)) {
            report.SyntaxErrors.push(email);
            return;
        }
        else if (!botAddressCheck(email)) {
            report.Seeds.push(email);
            return;
        }

        fixedMisSpelledEmail = fixMisSpelled(email, fuzzyMatch);
        if(email !== fixedMisSpelledEmail) {
            report.FixedMisSpelledDomains.push(fixedMisSpelledEmail);
            if(containsHeader) {
                data[emailColumnHeader] = fixedMisSpelledEmail;
            }
            else {
                data[emailIndex] = fixedMisSpelledEmail;
            }
            clearedEmails.push(data);
            return;
        }

        fixedLatinEmail = fixLatinCharacters(email);

        if(email !== fixedLatinEmail) {
            report.FixedLatinLetters.push(fixedLatinEmail);
            if(containsHeader) {
                data[emailColumnHeader] = fixedMisSpelledEmail;
            }
            else {
                data[emailIndex] = fixedMisSpelledEmail;
            }
        }

        clearedEmails.push(data);

    });

    var saveReports = [];

    _.forOwn(report, function (value, key) {
        saveReports.push({
            reportName: key,
            data: value
        });
    });
    //report.saveReports
    result.report = result.report || {};
    if(result.report.saveReports) {
        result.report.saveReports = _.concat(result.report.saveReports, saveReports);
    }
    else {
        result.report.saveReports = saveReports;
    }
    return {
        data: clearedEmails,
        report: result.report
    };
};


module.exports = {
    validate: validate
};