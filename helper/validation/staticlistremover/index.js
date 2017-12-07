/**
 * Created by titu on 11/1/16.
 */
const staticListEmailsRemover = require('./emails');
const staticListDomainsRemover = require('./domains');
const staticListEndingsRemover = require('./endings');
const words = require('./words');


let start = (result, header) => {
    return staticListEmailsRemover.remove (result, header)
        .then((result) => {
            return staticListDomainsRemover.remove(result, header);
        })
        .then((result) => {
            return staticListEndingsRemover.remove(result, header);
        });
}

module.exports = {
    start: start
};