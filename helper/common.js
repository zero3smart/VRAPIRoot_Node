/**
 * Created by titu on 11/2/16.
 */
const _ = require('lodash');

let getEmailParts = (email) => {

    var match = /(.*)@+([^.]*\.{1}\w+)((\.{1}\w+))*/g.exec(email);
    if(_.isNil(match)) {
        console.log('problem in breaking the email into parts: ' + email);
        return {
            user: null,
            domain: null,
            endings: null
        };
    }

    return {
        user: match[1],
        domain: match[2],
        endings: match[4]
    }

};

module.exports = {
    getEmailParts: getEmailParts
};