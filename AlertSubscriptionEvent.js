var sdk = require("./lib/sdk");
var config = require('./config.json');
var sub = require("./lib/RedisClient.js").createClient(config.redis);
var pub = require("./lib/RedisClient.js").createClient(config.redis);
pub.config("SET", "notify-keyspace-events", "KExA");



sub.on('message', function(channel, msg) {
    if (msg == "expired") {
        console.log("Triggered Feedback Message to User on " + channel + " message : " + msg);
        var id = channel.split(":")[1];
        pub.get(id + ":data", function(err, reply) {
            var tempData = JSON.parse(reply);
            var data = tempData;
            data.toJSON = function() {
                return {
                    __payloadClass: 'OnMessagePayload',
                    requestId: data.requestId,
                    botId: data.botId,
                    componentId: data.componentId,
                    sendUserMessageUrl: data.sendUserMessageUrl,
                    sendBotMessageUrl: data.sendBotMessageUrl,
                    context: data.context,
                    channel: data.channel,
                    message: data.context.callbackIntent,
                    overrideMessagePayload: {
                        body: data.context.callbackIntent,
                        isTemplate: false
                    }
                };
            };
            sdk.sendBotMessage(data);
        });
    }
});

function addEvent(data, intent, time) {
    console.log("Alert subscription event starting...")
    var uuid = data.channel.type + "/" + data.channel.from;
    console.log("add event", uuid);
    time = time || 90;
    data.context.callbackIntent = intent
    pub.set(uuid, JSON.stringify(data));
    pub.set(uuid + ":data", JSON.stringify(data));
    pub.expire(uuid, time);
    sub.subscribe("__keyspace@0__:" + uuid);
}

function deleteEvent(data) {
    var uuid = data.channel.type + "/" + data.channel.from;
    console.log("delete event", uuid);
    pub.del(uuid);
}
module.exports = {
    add: addEvent,
    delete: deleteEvent
}