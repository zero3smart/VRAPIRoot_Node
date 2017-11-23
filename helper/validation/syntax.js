/**
 * Created by titu on 10/25/16.
 */
const settings = require('../../config').settings;
const fuzzyMatching = require('fuzzy-matching');
const _ = require('lodash');

let fuzzyMatch = new fuzzyMatching(settings.fuzzyMatchingDomains);

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

let fixMisSpelled = (email) => {
    var domain = (email.split('@')).pop();
    var fixedSpelling = fuzzyMatch.get(domain, { maxChanges: 2 }).value;

    if(fixedSpelling) {
        email = email.replace(domain, fixedSpelling);
    }
    return email;
};

let buildResultOb = (result, type) => {
    return {
        result: result,
        report: {
            type: type
        }
    };
};

let validate = (result) => {
    var dataCollection = result.data;
    var clearedEmails = [];
    var email = null;
    var report = {
        'longemail': [],
        'syntaxerror': [],
        'seeds': [],
        'fixedMisspelledDomains': []
    };
    var fixedEmail = null;


    if(result.report) {
        report = _.merge(report, result.report);
    }

    dataCollection.forEach((data)=> {
        email = data[0];
        if (!lengthCheck(email)) {
            report.longemail.push(email);
            return;
        }
        else if (!spaceCharacterCheck(email)) {
            report.syntaxerror.push(email);
            return;
        }
        else if (!numOfDotOccurencesCheck(email)) {
            report.syntaxerror.push(email);
            return;
        }
        else if (!numOfAtTheRateOfOccurencesCheck(email)) {
            report.syntaxerror.push(email);
            return;
        }
        else if (!specialCharacterCheck(email)) {
            report.syntaxerror.push(email);
            return;
        }
        else if (!asciiCharacterCheck(email)) {
            report.syntaxerror.push(email);
            return;
        }
        else if (!botAddressCheck(email)) {
            report.seeds.push(email);
            return;
        }
        else {
            fixedEmail = fixMisSpelled(data[0]);
            if(data[0] !== fixedEmail) {
                report.fixedMisspelledDomains.push(fixedEmail);
                data[0] = fixedEmail;
            }
            clearedEmails.push(data);
        }

    });

    return {
        data: clearedEmails,
        report: report
    };
};


module.exports = {
    validate: validate
};