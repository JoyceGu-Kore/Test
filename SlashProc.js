var _ = require('lodash');
var api = require('./SalesforceLiveChatAPI.js');
var translateService = require('./TranslateService.js').getInstance();

function SlashProc() {}

//text is the plain text (e.g. String) to send to the agent
//data is a sample data message from the user
function sendAgentMessage(text, data) {
    if(!data) {
        console.log('missing data')
        return;
    }
    var channel = data.channel;
    if(!channel) {
        console.log('missing channel');
        return;
    }
    //var visitorId = channel.from;
    var visitorId = _.get(data, 'context.session.BotUserSession.userID');
    console.log("Visitor Id ",visitorId);
    if(!visitorId) {
        console.log('missing from - no visitorId');
        return;
    }
    var entry = _map[visitorId];
    if(!entry) {
        console.log('unable to lookup visitorId: ' + visitorId);
        return;
    }
    var session_key = entry.session_key;
    if(!session_key) {
        console.log('unable to find session_key');
        return;
    }
    var affinity_token = entry.affinity_token;
    if(!affinity_token) {
        console.log('unable to find affinity_token');
        return;
    }
    sendAgentTextMessage(text, session_key, affinity_token);
}

//the more basic underlying function to send a message to an agent
function sendAgentTextMessage(text, session_key, affinity_token) {
    var message = {
        text: text
    };
    api.sendMsg(session_key, affinity_token, message)
        .catch(function (e) {
            console.error(e);
            delete userDataMap[visitorId];
            delete _map[visitorId];
        });
}

async function translate(agentText, visitorId, lastVisitorText, session_key, affinity_token) {
    if(!lastVisitorText) {
        sendAgentTextMessage('There is no user input to translate yet', session_key, affinity_token);
        return;
    }
    var translateResult = await translateService.translate(lastVisitorText, 'es', 'en');
    if(!translateResult) {
        sendAgentTextMessage('The translation failed for some reason', session_key, affinity_token);
        return;
    }
    var msgToAgent =
        'Translation from Spanish to English\n\n' +
        'The user said:\n' + lastVisitorText + '\n\n' +
        'The English translation is:\n' + translateResult;
    sendAgentTextMessage(msgToAgent, session_key, affinity_token);
}

SlashProc.prototype.handle = function handle(agentText, visitorId, lastVisitorText, session_key, affinity_token) {
    var lowerAgentText = agentText.toLowerCase().trim();
    if(!lowerAgentText.startsWith('/'))
        return false;
    //there will be other /<verbs> than just /translate
    if(lowerAgentText.startsWith('/translate')) {
        translate(agentText, visitorId, lastVisitorText, session_key, affinity_token);
        return true;
    }
    return false;
}

module.exports.getInstance = function getInstance() {
    return new SlashProc();
}