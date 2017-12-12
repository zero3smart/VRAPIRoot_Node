/**
 * Created by titu on 11/2/16.
 */

let getEmailParts = (email) => {

    console.log(email);
    //let match = /@+(\w+\.{1}\w+)(\.{1}(\w+))*/g.exec(email);
    var match = /(.*)@+([^.]*\.{1}\w+)(\.{1}(\w+))*/g.exec(email);
    console.log(match)
    return {
        user: match[1],
        domain: match[2],
        endings: match[4]
    }
};

module.exports = {
    getEmailParts: getEmailParts
};