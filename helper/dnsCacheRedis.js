/**
 * Created by titu on 12/5/16.
 */
const redis = require('redis');
const promise = require('bluebird');

promise.promisifyAll(redis.RedisClient.prototype);
promise.promisifyAll(redis.Multi.prototype);

let initializeRedis = () => {
    let client = redis.createClient();

    return new promise(function (resolve, reject) {
        client.on('connect', function () {
            module.exports.redisClient = client;
            console.log('Redis connected successfully.');
            resolve(client);
        });

        client.on('error', function (error) {
            console.log('Error in connecting with Redis: ');
            console.log(error);
            reject(error);
        });
    });
};

module.exports = {
    initialize: initializeRedis,
    //redis.client
};
