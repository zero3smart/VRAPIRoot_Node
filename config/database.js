/**
 * Created by titu on 10/17/16.
 */

let getDatabaseConfig = () => {
    return {
        name: 'EmailScrub',
        host: '127.0.0.1',
        port: 27017
    };
};
let getDatabaseUrl = (config) => {
    return process.env.MONGOLAB_URI ||
        process.env.MONGOHQ_URL ||
        config.host + ':' + config.port + '/' + config.name;
};

module.exports = {
    getDatabaseConfig: getDatabaseConfig,
    getDatabaseUrl: getDatabaseUrl
};