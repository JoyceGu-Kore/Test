var config = require("./config.json");
var botId = Object.keys(config.credentials);
var botName = "Visual IVR";
var sdk = require("./lib/sdk");
var redis = require("redis");
var redisClient = redis.createClient();
var ObjectTypes = require("./lib/sdk/ObjectTypes");


var Promise = require("bluebird");

var api = require('./SalesforceLiveChatAPI.js');
var _ = require('lodash');
var config = require('./config.json');
var sfdc_config_file = require("./config.json").sfdc_config_file;
var sfdc_config = require(sfdc_config_file);
var debug = require('debug')("Agent");
var schedular = require('node-schedule');
var rp = require('request-promise');

var _map = {}; //used to store secure session ids //TODO: need to find clear map var
var userDataMap = {}; //this will be use to store the data object for each user
var userResponseDataMap = {};
var historyIgnoreMessages = ["INITIAL DIALOG", "#session_closed"];
var slashProc = require('./SlashProc.js').getInstance();
var lastUserMessages = {};  //used to store the last user message, key is the visitorId

function getPendingMessages(visitorId, session_key, affinity_token) {
    return api.getPendingMessages(session_key, affinity_token)
        .then(function(res) {
            var data = userDataMap[visitorId];
            console.log("Polling", JSON.stringify(res));
            _.each(res.messages, function(event, key) {
                console.log(event);
                if (event.type === "ChatEstablished") {
                    console.log('connected ', event);
                    debug('chat established ', event);
                    var timeout = event.message.chasitorIdleTimeout.timeout
                    data.context.session_key = session_key;
                    data.context.affinity_token = affinity_token;
                } else if (event.type === "ChatMessage") {
					//if the agent's chat message starts with a "/" handle it specially, e.g. /translate	
                    if(slashProc.handle(event.message.text, visitorId, lastUserMessages[visitorId], session_key, affinity_token))	
                        return;
                    console.log('replying ', event);
                    debug('replying ', event);
                    data.message = event.message.text;
                    var initials = event.message.name.match(/\b\w/g) || [];
                    initials = ((initials.shift() || '') + (initials.pop() || '')).toUpperCase();
                    var overrideMessagePayload = {
                        body: JSON.stringify({
                            "type": "template",
                            "payload": {
                                "template_type": "live_agent",
                                "text": event.message.text,
                                "agent_name": initials
                            }
                        }),
                        isTemplate: true
                    };
                    data.overrideMessagePayload = overrideMessagePayload;
                    var interval = key >= 1 ? 1000 * (key) : 0;
                    setTimeout(function(tempdata) {
                        return sdk.sendUserMessage(tempdata, function(err) {
                            console.log("err", err);
                            if (err) {
                                return api.endChat(session_key, affinity_token).then(function(re) {
                                    debug("sending agent reply error", e);
                                    delete userResponseDataMap[visitorId];
                                    delete _map[visitorId];
                                    sdk.clearAgentSession(data);
                                    return;
                                });
                            }
                        }).catch(function(e) {
                            console.log(e);
                        });
                    }, interval, _.clone(data));
                } else if (event.type === "ChatEnded") {
                    console.log('chat_closed');
                    delete userResponseDataMap[visitorId];
                    delete _map[visitorId];
                    console.log(visitorId);
                    sdk.clearAgentSession(data);
                    data.message = "The chat with the agent has been closed.";
                    return sdk.sendUserMessage(data);
                } else if (event.type === "ChatRequestFail") {
                    console.log('unavaialble');
                    data.message = "I'm sorry, no agents are available at this time.  You can try the virtual assistant again or have someone get back to you at a later time."
                    console.log("Clearing maps and agent session...")
                    delete userResponseDataMap[visitorId];
                    delete _map[visitorId];
                    sdk.clearAgentSession(data);
                    return sdk.sendUserMessage(data);
                }
            });
        })
        .catch(function(e) {
            //console.error(e.message);
        });
}


schedular.scheduleJob('*/5 * * * * *', function() {
    debug('schedular triggered');
    var promiseArr = [];
    _.each(_map, function(entry) {
        promiseArr.push(getPendingMessages(entry.visitorId, entry.session_key, entry.affinity_token));
    });
    return Promise.all(promiseArr).then(function() {
        debug('scheduled finished');
    }).catch(function(e) {
        debug('error in schedular', e);
    });
});

function connectToAgent(requestId, data, cb) {
    console.log("Live agent connection");

    var visitorId = _.get(data, 'context.session.BotUserSession.userUN');
    console.log("---------", visitorId);
    if (!visitorId) {
        visitorId = _.get(data, 'channel.from');
    }
    userDataMap[visitorId] = data;
    data.message = "An Agent will be assigned to you shortly!!!";
    var context = data.context;

    sdk.sendUserMessage(data, cb);
    var bus = context.session.BotUserSession;
    return api.getSession()
        .then(function(session) {
            var options = {};

            options.buttonId = sfdc_config.live_agent.buttonId;
            return api.initChat(session, options, visitorId)
                .then(function(res) {
                    _map[visitorId] = {
                        session_key: session.key,
                        affinity_token: session.affinityToken,
                        visitorId: visitorId,
                        last_message_id: 0
                    };
                    var userContext = context.session.UserContext,
                        identity = "";
                    if (userContext) {
                        identity = (userContext.firstName) ? userContext.firstName + " " : "";
                        identity += (userContext.lastName) ? userContext.lastName : "";
                        identity += (identity.trim() === "" && userContext.emailId) ? userContext.emailId : "";
                        if (identity.trim() === "") identity = "Kore bot";
                    }

                    var linkUrl = config.app.url + "/visualIVR/history/index.html?visitorId=" + visitorId;
                    var historyTags = (context.historicTags && context.historicTags[0] && context.historicTags[0].tags) ? context.historicTags[0].tags.join("\n") : "";
                    var lastMessage = _.get(data, 'context.session.BotUserSession.lastMessage.messagePayload.message.body', "");
                    var message = {
                        text: "Hi Rob, a user needs help.\nChat history : " + linkUrl + "\nHistory tags : " + historyTags + "\nLast message : " + lastMessage
                    }

                    return api.sendMsg(session.key, session.affinityToken, message)
                        .catch(function(e) {
                            console.error(e);
                            delete userDataMap[visitorId];
                            delete _map[visitorId];
                            return;
                        });

                });
        }).catch(function(err) {
            console.log(err)
            delete userResponseDataMap[visitorId];
            delete _map[visitorId];
            sdk.clearAgentSession(data);
            data.message = "I'm sorry, no one is available to help you right now. Please give us a call at ..... so we can assist you."
            data.overrideMessagePayload = null;
            return sdk.sendUserMessage(data);
        });
}

function onUserMessage(requestId, data, cb) {
    var visitorId = _.get(data, 'context.session.BotUserSession.userUN');
    console.log(visitorId);
    if (data.channel && !data.channel.channelInfos) {
        data.channel.channelInfos = {
            from: visitorId
        }
    }

    userDataMap[visitorId] = data;
    var entry = _map[visitorId];
    console.log("user message : ", data.message, entry);

    if (data.message === "clear" || data.message === "####" || data.message === "quit" || data.message === "stop chat") {
        delete userDataMap[visitorId];
        delete _map[visitorId];
        sdk.clearAgentSession(data);
        data.message = "The chat with the agent has been closed.";
        sdk.sendUserMessage(data);
        return;
    }
    if (entry) {
		lastUserMessages[visitorId] = data.message;
        var session_key = entry.session_key;
        var affinity_token = entry.affinity_token;
        var message = {
            text: data.message
        }
        data.context.session_key = session_key;
        data.context.affinity_token = affinity_token;
        return api.sendMsg(session_key, affinity_token, message)
            .catch(function(e) {
                console.error(e);
                delete userDataMap[visitorId];
                delete _map[visitorId];
                return sdk.sendBotMessage(data, cb);
            });
    } else {
        return sdk.sendBotMessage(data, cb);
    }
}

function onBotMessage(requestId, data, cb) {
    var visitorId = _.get(data, 'channel.from');
    var entry = _map[visitorId];

    var message_tone = _.get(data, 'context.dialog_tone');
    if (message_tone && message_tone.length > 0) {
        var angry = _.filter(message_tone, {
            tone_name: 'angry'
        });
        if (angry.length) {
            angry = angry[0];
            if (angry.level >= 2) {
                connectToAgent(requestId, data);
            } else {
                sdk.sendUserMessage(data, cb);
            }
        } else {
            sdk.sendUserMessage(data, cb);
        }
    } else if (!entry) {
        sdk.sendUserMessage(data, cb);
    }
}

module.exports = {
    botId: botId,
    botName: botName,

    on_user_message: function(requestId, data, callback) {

        if (data.context.session.opts.streamId === "st-5dda620c-eaf9-55c7-b8dc-0d45927f00f4") {
            if (data.channel.botEvent === "ON_CONNECT_EVENT") {
                data.metaInfo = {
                    setBotLanguage: "en"
                };
                var overrideMessagePayload = {
                    body: JSON.stringify({
                        "type": "template",
                        "payload": {
                            "template_type": "quick_replies",
                            "text": "Please select your preffered language before proceeding.",
                            "quick_replies": [{
                                "content_type": "text",
                                "title": "English",
                                "payload": "en"
                            }, {
                                "content_type": "text",
                                "title": "Español",
                                "payload": "es"
                            }, {
                                "content_type": "text",
                                "title": "Kreyòl",
                                "payload": "fr"
                            }]
                        }
                    }),
                    isTemplate: true
                };
                data.overrideMessagePayload = overrideMessagePayload;
                return sdk.sendUserMessage(data);
            }


        }
        onUserMessage(requestId, data, callback);
    },
    on_bot_message: function(requestId, data, callback) {
        if (data.context.session.opts.streamId === "st-5dda620c-eaf9-55c7-b8dc-0d45927f00f4") {
            if (data.message === '') {
                return sdk.skipUserMessage(data)
            }
        }
        onBotMessage(requestId, data, callback);
    },
    on_agent_transfer: function(requestId, data, callback) {
        connectToAgent(requestId, data, callback);
    },
    on_event: function(requestId, data, callback) {
        console.log("on_event -->  Event : ", data.event, data.context.intent);
        return callback(null, data);
    },
    on_webhook: function(requestId, data, componentName, callback) {
        try {
            var uId = data.context.session.BotUserSession.uID;
            console.log("Webhook : ", requestId, componentName, uId, new Date().toISOString());
            redisClient.set(uId, JSON.stringify(data));
            callback(null, new sdk.AsyncResponse()); //202 resp
        } catch (error) {
            console.error("Error in webhook : ", error.message);
            sdk.respondToHook(data);
        }
    },
    claimNotifier: function(req, res) {
        try {
            var uId = req.body.uID;
            redisClient.get(uId, function(err, reply) { //it will delete from redis
                if (err) {
                    console.error("Error : ", err.message);
                    throw new error(err);
                }
                var reqData = JSON.parse(reply);
                var ObjectType = ObjectTypes[reqData.__payloadClass];
                console.log("Route : ", reqData.requestId, uId, new Date().toISOString());
                sdk.respondToHook(new ObjectType(reqData.requestId, reqData.botId, reqData.componentId, reqData));
                res.sendStatus(200);
            });
        } catch (e) {
            console.log("error in pstfn ", e.message);
            res.sendStatus(400);
        }
    },
    gethistory: function(userId) {
        var url = "https://bots.kore.ai/api/public/stream/st-e1710adf-3d19-53c8-ab6b-46510d7602ba/getMessages?userId=" + userId + "&limit=100&channelType=ivrVoice";

        var options = {
            method: 'GET',
            uri: url,
            headers: {
                'auth': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlZpc3VhbCBJVlIiLCJhcHBJZCI6ImNzLTAzZjRmOTAwLTYxOGYtNTJhMS1iMGM2LTliNzZjYjc2NWZiNSJ9.q5YiMqf2h5TB-qKp875zsvgmbjeyXM6OjBtxbY51x9E'
            }
        };
        return rp(options).then(function(res) {
            console.log(res);
            return JSON.parse(res);
        }).catch(function(err) {
            return Promise.reject(err);
        });
    }
};