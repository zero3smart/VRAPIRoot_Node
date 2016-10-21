/**
 * Created by titu on 10/17/16.
 */

const startApi = require('../api/start');

let initializeRouter = (app) => {
    startApi.init(app);
    app.get('/', (request, response) => {
        response.send('<h2>Welcome to REST API</h2><h3>User API built with Node.js</h3>');
    });
    app.use((request, response) => {
        response.status(404).send('Requested service not found');
    });
};

module.exports = initializeRouter;