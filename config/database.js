/**
 * Created by titu on 10/17/16.
 */

let getDevDatabaseConfig = () => {
    return {
        name: 'EmailScrub',
        host: '127.0.0.1',
        port: 27017
    };
};

let getStagingDatabaseConfig = () => {
    return {
        name: 'EmailScrub',
        host: '205.134.243.196',
        port: 27017
    };
};

let getProductionDatabaseConfig = () => {
    return {
        name: 'EmailScrub',
        host: '205.134.243.196',
        port: 27017
    };
};

let getDatabaseConfig = () => {
    let config = getDevDatabaseConfig();

    switch (process.env.NODE_ENV) {
        case 'staging':
            config = getStagingDatabaseConfig();
            break;
        case 'production':
            config = getProductionDatabaseConfig();
            break;
    }

    return config;
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