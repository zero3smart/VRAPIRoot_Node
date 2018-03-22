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
        host: '64.187.105.88',
        port: 27017,
        userName: 'emailscrub',
        password: '3Hyg13n1X8181'
    };
};

let getProductionDatabaseConfig = () => {
    return {
        name: 'EmailScrub',
        host: '64.187.105.88',
        port: 27017,
        userName: 'emailscrub',
        password: '3Hyg13n1X8181'
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
