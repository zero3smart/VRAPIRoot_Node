/**
 * Created by titu on 12/5/16.
 */
const redis = require('redis');
const redisClient = require('./redis').redisClient;
const promise = require('bluebird');
const dns = promise.promisifyAll(require("dns"));
const dnscacher = require('dnscache');

let initialize = () => {
    let dnsCache = dnscacher({
        "enable": true,
        "ttl": 2592000,
        "cachesize": 5000000,//5000k
        "cache": _dnsCacheWithRedis
    });
    module.exports.dnsCache = dnsCache;

    return dnsCache;
};

let _dnsCacheWithRedis = function dnsCacheRedis(config) {

    var redisKey = 'dnscache:';
    var redisClient = require('./redis').redisClient;

    config.ttl = config.ttl || 2592000 // Cache for 30 days

    this.set = function (key, value, callback) {
        redisClient.set(redisKey + key, JSON.stringify(value), 'NX', 'EX', config.ttl, function (err) {
            if (callback) {
                callback(err, value);
            }
        });
    };

    this.get = function (key, callback) {
        redisClient.get(redisKey + key, function (err, item) {
            if (callback) {
                callback(err, JSON.parse(item));
            }
        });
    };
};

module.exports = {
    initialize: initialize
};
