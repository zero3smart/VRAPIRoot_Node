/**
 * Created by titu on 11/2/16.
 */

let getEmailParts = (email) => {

    let match = /@+(\w+\.{1}\w+)(\.{1}(\w+))*/g.exec(email);

    return {
        domain: match[1],
        endings: match[3]
    }
};

module.exports = {
    getEmailParts: getEmailParts
};