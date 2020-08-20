var sdk = require("./lib/sdk");
var Promise = require('bluebird');
var request = require('request-promise');
var template = require('url-template');

var sfdc_config_file = require("./config.json").sfdc_config_file;
var config = require(sfdc_config_file);
var liveAgentUrl = config.live_agent.liveAgentUrl;

//live agent 
var organizationId = config.live_agent.organizationId;
var deploymentId = config.live_agent.deploymentId;
var apiVersion = config.live_agent.apiVersion;
var screenResolution = config.live_agent.screenResolution;
var userAgent = config.live_agent.userAgent;
var language = config.live_agent.language;

//Oauth
var client_id = "3MVG9KsVczVNcM8zdMZBb2wKOHOHMswgUFMqLITL0vsLjszghaLSFFJyaQvlxoVhq7_7B6NE_Vh0Vr.XPk91L";
var client_secret = "D3EE8041787539E56D49DDCCAB789C1133B303AEDB21490908BD97DBC65304AB";
var username = "John Doe";
var password = "";

function getSession() {
    var url = liveAgentUrl + "/System/SessionId";
    var options = {
        method: 'GET',
        uri: url,
        headers: {
            'X-Liveagent-Affinity': 'null',
            'X-Liveagent-Api-Version': apiVersion
        }
    };
    return request(options).then(function (res) {
        return JSON.parse(res);
    }).catch(function (err) {
        return Promise.reject(err);
    });

}


function initChat(session, options, phoneNum) {

    var url = liveAgentUrl + "/Chasitor/ChasitorInit"
    var sessionId = session.id,
        sessionKey = session.key,
        affinityToken = session.affinityToken;

    var prechatDetails = [];

    var body = {
        "organizationId": organizationId,
        "deploymentId": deploymentId,
        "sessionId": sessionId,
        "buttonId": config.live_agent.buttonId,
        "screenResolution": screenResolution,
        "userAgent": userAgent,
        "language": language,
        "visitorName": phoneNum,
        "prechatDetails": prechatDetails,
        "prechatEntities": [],
        "receiveQueueUpdates": true,
        "isPost": true
    };
    var options = {
        method: 'POST',
        uri: url,
        headers: {
            'X-Liveagent-Sequence': '1',
            'X-Liveagent-Affinity': affinityToken,
            'X-Liveagent-Session-Key': sessionKey,
            'X-Liveagent-Api-Version': apiVersion
        },
        body: body,
        json: true
    };
    //console.log(JSON.stringify(options));
    return request(options).then(function (res) {
        return res;
    })
        .catch(function (err) {
            return Promise.reject(err);
        });
}

function sendMsg(session_key, affinity_token, data) {
    var url = liveAgentUrl + "/Chasitor/ChatMessage"
    var options = {
        method: 'POST',
        uri: url,
        body: data,
        json: true,
        headers: {
            'X-LIVEAGENT-API-VERSION': apiVersion,
            'X-LIVEAGENT-AFFINITY': affinity_token,
            'X-LIVEAGENT-SESSION-KEY': session_key
        }
    };
    return request(options).then(function (res) {
        //return JSON.parse(res);
        console.log("@@####@@@", res);
        return res;
    })
        .catch(function (err) {
            return Promise.reject(err);
        });
}

function getPendingMessages(session_key, affinity_token) {
    var url = liveAgentUrl + "/System/Messages"
    var options = {
        method: 'GET',
        uri: url,
        headers: {
            'X-LIVEAGENT-API-VERSION': apiVersion,
            'X-LIVEAGENT-AFFINITY': affinity_token,
            'X-LIVEAGENT-SESSION-KEY': session_key
        }
    };
    return request(options).then(function (res) {
        return JSON.parse(res);
    })
        .catch(function (err) {
            return Promise.reject(err);
        });
}

function endChat(session_key, affinity_token) {
    var url = liveAgentUrl + "/Chasitor/ChatEnd"
    var options = {
        method: 'POST',
        uri: url,
        body: { reason: "client" },
        json: true,
        headers: {
            'X-LIVEAGENT-API-VERSION': apiVersion,
            'X-LIVEAGENT-AFFINITY': affinity_token,
            'X-LIVEAGENT-SESSION-KEY': session_key
            //'X-LIVEAGENT-SEQUENCE':"1"
        }
    };
    return request(options).then(function (res) {
        //return JSON.parse(res);
        return res;
    })
        .catch(function (err) {
            return Promise.reject(err);
        });
}

function authorization() {
    var url = SFDC_TOKEN_URL + "/services/oauth2/token"
    var options = {
        method: 'POST',
        uri: url,
        qs: {
            "grant_type": "password",
            "client_id": client_id,
            "client_secret": client_secret,
            "username": username,
            "password": password
        }
    };
    return request(options).then(function (res) {
        return JSON.parse(res);
    })
        .catch(function (err) {
            return Promise.reject(err);
        });
}

function getChatButtons(MasterLabel, token) {
    var initUrl = SFDC_API_URL + "/services/data/v29.0/query/?q=SELECT Id, DeveloperName,MasterLabel, IsActive, CreatedDate FROM LiveChatButton WHERE MasterLabel='{MasterLabel}'";

    var url = template.parse(initUrl).expand({ MasterLabel: MasterLabel });
    var options = {
        method: 'GET',
        uri: url,
        headers: {
            "Authorization": "Bearer " + token
        }

    };
    return request(options).then(function (res) {
        var data = JSON.parse(res);
        return data.records;
    })
        .catch(function (err) {
            return Promise.reject(err);
        });
};


function createTranscript(data, access_token) {
    var LiveChatButtonId = data.LiveChatButtonId || config.live_agent.buttonId;
    var body = {
        "LiveChatVisitorId": data.LiveChatVisitorId,
        "LiveChatDeploymentId": deploymentId,
        "LiveChatButtonId": data.LiveChatButtonId,
        "Body": data.Body,
        "RequestTime": data.RequestTime,
        "StartTime": data.StartTime,
        "EndTime": data.EndTime,
        "Chat_Transferred_from_Kore__c": data.Chat_Transferred_from_Kore__c
    }
    body.LiveChatDeploymentId = deploymentId;
    var url = SFDC_API_URL + "/services/data/v40.0/sobjects/LiveChatTranscript"
    var options = {
        method: 'POST',
        uri: url,
        body: body,
        json: true,
        headers: {
            authorization: "Bearer " + access_token
        }
    };
    console.log(options);
    return request(options).then(function (res) {
        return res;
    })
        .catch(function (err) {
            return Promise.reject(err);
        });
}

function createChatVisitorSession() {
    var url = liveAgentUrl + "/Visitor/VisitorId"
    var options = {
        method: 'GET',
        uri: url,
        qs: {
            "org_id": organizationId,
            "deployment_id": deploymentId
        },
        headers: {
            'X-LIVEAGENT-API-VERSION': apiVersion
        }
    };
    return request(options).then(function (res) {
        return JSON.parse(res);
    })
        .catch(function (err) {
            return Promise.reject(err);
        });
}

function createVisitor(body, access_token) {
    var url = SFDC_API_URL + "/services/data/v40.0/sobjects/LiveChatVisitor"
    var options = {
        method: 'POST',
        uri: url,
        body: body,
        json: true,
        headers: {
            authorization: "Bearer " + access_token
        }
    };
    return request(options).then(function (res) {
        return res;
    })
        .catch(function (err) {
            return Promise.reject(err);
        });
}

module.exports.initChat = initChat;
module.exports.sendMsg = sendMsg;
module.exports.getPendingMessages = getPendingMessages;
module.exports.getSession = getSession;
module.exports.endChat = endChat;
module.exports.authorization = authorization;
module.exports.getChatButtons = getChatButtons;
module.exports.createTranscript = createTranscript;
module.exports.createVisitor = createVisitor;
module.exports.createChatVisitorSession = createChatVisitorSession;
