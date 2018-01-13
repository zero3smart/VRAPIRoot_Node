/**
 * Created by titu on 11/1/16.
 */
const staticListEmailsRemover = require('./emails');
const staticListDomainsRemover = require('./domains');
const staticListEndingsRemover = require('./endings');
const staticListBadWords = require('./words');
const staticListRoles = require('./role');


let start = (result, header) => {
    console.log('starting with staticListEmailsRemover...');
    return staticListEmailsRemover.remove (result, header)
        .then((result) => {
            console.log('starting with staticListDomainsRemover...');
            return staticListDomainsRemover.remove(result, header);
        })
        .then((result) => {
            console.log('starting with staticListEndingsRemover...');
            return staticListEndingsRemover.remove(result, header);
        })
        .then((result) => {
            console.log('starting with staticListBadWords...');
            return staticListBadWords.remove(result, header);
        })
        .then((result) => {
            console.log('starting with staticListRoles...');
            return staticListRoles.remove(result, header);
        });
}

module.exports = {
    start: start
};