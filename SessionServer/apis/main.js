'use strict';

var apis = exports.apis = {};

// client login: create session for client
apis.ClientLogin = function(protocol, cb){
	var self = this;
	try {
		var market = global.const.pMarket[protocol.market];
		protocol.clientVersion || (protocol.clientVersion = 100);
	    if (typeof(market) !== 'string' ||
	        typeof(protocol.deviceId) !== 'string' ||
	        typeof(protocol.clientVersion) !== 'number')
	        throw new Error('__invalid_param');

	   	protocol.market = market;

	    self.policy.session.createSession(protocol, function(err, key){
            cb(err, {
                result : 'success',
                appSessionKey : key,
                dataVersion : protocol.clientVersion
            });
	    });

	}catch (ex) {
		cb(ex)
	}
};


// user login: generate uid, add more info to session
apis.UserLogin = function(protocol, cb) {

};

// check crc: verify clients master data
apis.CheckTableCrc = function(protocol, cb) {

};

apis.UserSocketLogin = function(socket, protocol, cb) {
	var self = this;
	try {
		var session = protocol.__session;
        if (session.deviceId !== protocol.deviceId)
            throw new Error('__invalid_param');

        clearTimeout(socket.__timeId);
        delete socket.__timeId;
        socket.__appSessionKey = protocol.appSessionKey;
        socket.__channel = {};
        socket.__uid = session.uid;
        global.base.users[session.uid] = socket;
        cb(null, { result : 'success' });

	}catch (ex) {
		cb(ex)
	}
};


apis.HeartBeat = function(socket, protocol, cb) {
	var now = new Date();
	var session = protocol.__session;
        // socket redirection..
        cb(null, { result : 'success', serverTime : now });
};

apis.JoinChannel = function(socket, protocol, cb) {
	var self = this;
	try {
		self.channel.joinChannel(socket, protocol.channelType, protocol.idx);
		var now = new Date();
		cb(null, { result : 'success', serverTime : now });
	}catch (ex) {
		cb(ex)
	}
};

apis.SendChattingMsg = function(socket, protocol, cb) {
	var self = this;
	try {
		self.channel.sendChannelMsg(socket, protocol.appSessionKey, protocol.channelType, protocol.msg);
		var now = new Date();
		cb(null, { result : 'success', serverTime : now });
	}catch (ex) {
		cb(ex)
	}
};

apis.RecvChannelMsg = function(key, message, cb) {
	var self = this;
	self.channel.recvChannelMsg(key, {msg: message.msg});
	cb(null);
};

