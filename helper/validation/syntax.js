/**
 * Created by titu on 10/25/16.
 */
const settings = require('../../config').settings;
const _ = require('lodash');

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

let buildResultOb = (result, type) => {
    return {
        result: result,
        report: {
            type: type
        }
    };
};

let validate = (dataCollection) => {
    var clearedEmails = [];
    var report = {
        'longemail': 0,
        'syntaxerror': 0,
        'seeds': 0
    };
    var email = null;

    dataCollection.forEach((data)=> {
        email = data[0];
        if (!lengthCheck(email)) {
            ++report.longemail;
            return;
        }
        else if (!spaceCharacterCheck(email)) {
            ++report.syntaxerror;
            return;
        }
        else if (!numOfDotOccurencesCheck(email)) {
            ++report.syntaxerror;
            return;
        }
        else if (!numOfAtTheRateOfOccurencesCheck(email)) {
            ++report.syntaxerror;
            return;
        }
        else if (!specialCharacterCheck(email)) {
            ++report.syntaxerror;
            return;
        }
        else if (!asciiCharacterCheck(email)) {
            ++report.syntaxerror;
            return;
        }
        else if (!botAddressCheck(email)) {
            ++report.seeds;
            return;
        }
        else {
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