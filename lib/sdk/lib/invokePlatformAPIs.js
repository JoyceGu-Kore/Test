var request = require("request");
var Promise = require("bluebird");
var jwt     = require("jwt-simple");
var config  = require("../../../config");

function getSignedJWTToken(botId) {
    var appId,apiKey;
    if(config.credentials[botId]){
        appId = config.credentials[botId].appId;
        apiKey = config.credentials[botId].apikey;
    }
    else{
        appId = config.credentials.appId;
        apiKey = config.credentials.apikey;
    }
    return jwt.encode({ appId: appId }, apiKey);
}

function makeRequest(url, method, body) {
    var botId = url.split("/")[6];
    var reqOptions = {
        url     : url,
        method  : method,
        headers : {
            'content-type' : 'application/json',
            'auth'         : getSignedJWTToken(botId)
        }
    };
    if (body) {
        reqOptions.body = body;
    }
    reqOptions.json = true;

    return new Promise(function(resolve, reject) {
        request(reqOptions, function(err, res) {
            if (err) {
                return reject(err);
            }
            return resolve(res.body);
        });
    });
}

module.exports = {
    post : function(url, body, callback) {
        return makeRequest(url, 'post', body)
            .nodeify(callback);
    },
    get  : function(url, callback) {
        return makeRequest(url, 'get')
            .nodeify(callback);
    }
};
