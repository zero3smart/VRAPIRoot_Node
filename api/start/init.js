/**
 * Created by titu on 10/17/16.
 */

const api = require('./api');

let initStart = (app) => {
    app.get('/clean', api.clean);
};

module.exports = initStart;