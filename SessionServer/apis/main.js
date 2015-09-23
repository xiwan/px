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

apis.GetVersionList = function(protocol, cb) {
	var self = this;
	try {
		var dataVersion = protocol.dataVersion;

	}catch(ex) {
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
        delete socket.__timeId; // successful login will remove the timer
        socket.__appSessionKey = protocol.appSessionKey;
        socket.__channel = {}; // cache the channels joined [1: pub, 2: clan, 3: team]
        socket.__uid = session.uid;
        socket.__expire = (new Date()).getTime() + global.const.SOCKET_EXPIRE;
        global.base.users[session.uid] = socket; //cache the socket by uid
        cb(null, { result : 'success' });
	}catch (ex) {
		cb(ex)
	}
};

apis.JoinChannel = function(socket, protocol, cb) {
	var self = this;
	try {
		self.channel.joinChannel(socket, protocol.channelType, protocol.idx);
		cb(null, { result : 'success'});
	}catch (ex) {
		cb(ex)
	}
};

apis.SendChattingMsg = function(socket, protocol, cb) {
	var self = this;
	try {
		self.channel.sendChannelMsg(socket, protocol.appSessionKey, protocol.channelType, protocol.msg);
		var now = new Date();
		cb(null, { result : 'success'});
	}catch (ex) {
		cb(ex)
	}
};

apis.RecvChannelMsg = function(key, message, cb) {
	var self = this;
	self.channel.recvChannelMsg(key, {msg: message.msg});
	
	var service = global.base.getServiceList('SA')[0];
	service.requestAction('simPlayers', {msg: message.msg}, function(){});

	cb(null, { result : 'success'});
};

apis.HeartBeat = function(socket, protocol, cb) {
	var session = protocol.__session;
    // socket redirection..
    cb(null, { result : 'success'});
};
