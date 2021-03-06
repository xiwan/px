'use strict';

var fs = require('fs');
var util = require('util');
var base = require('../../libs/app_base');

var apis = exports.apis = {};
base.apiDetector(apis, __dirname);

// client login: create session for client
apis.EFClientLogin = function(protocol, cb){
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
		global.warn('EFClientLogin message: %s', ex.message);
		cb(ex)
	}
};

apis.EFGetVersionList = function(protocol, cb) {
	var self = this;
	try {
		if (!protocol.dataVersion||
	        typeof(protocol.dataVersion) !== 'number')
			throw new Error('__invalid_param');
		var dataVersion = parseInt(protocol.dataVersion);
		var service = global.base.getServiceList('WA')[0];
		service.requestAction('getCurrentFileVersion', function(err, iList, iSum){
			if (dataVersion <= iSum) {
				cb(null, {result : 'success', iList: iList, iSum: iSum});
			}else {
				cb(null, {result : 'success', iSum: iSum});
			}
		});

	}catch(ex) {
		global.warn('EFGetVersionList message: %s', ex.message);
		cb(ex)
	}

};

// check crc: verify clients master data
apis.EFCheckTableCrc = function(protocol, cb) {
	var self = this;
	try {
        if (!util.isArray(protocol.items))
            throw new Error('__invalid_param');
        if (protocol.items.length === 0 && !(process.env.mode == 'dev' || process.env.mode == 'test' ))
            throw new Error('__invalid_param');
        
        var service = global.base.getServiceList('WA')[0];
		service.requestAction('getCurrentFileVersion', function(err, iList, iSum){
			var flag = true;
	        protocol.items.forEach(function(item) {
	        	iList.forEach(function(list){
		        	if (item.name == list.sheet) {
						//console.log(item.name, item.crc, list.crc);
		        		if (item.crc != list.crc) {
		        			flag = false;
		        		}
		        	}
        		});					
			});
			cb(null, {result : 'success', crc: flag});
		});
	}catch(ex) {
		global.warn('EFCheckTableCrc message: %s', ex.message);
		cb(ex)
	}
};

apis.EFGetDevVersion = function(protocol, cb) {
	var self = this;
	try {
		var service = global.base.getServiceList('WA')[0];
		service.requestAction('getVersionList', function(err, results){
			cb(null, {result : 'success', iList: results});
		});
	}catch(ex) {
		global.warn('EFGetDevVersion message: %s', ex.message);
		cb(ex);
	}
};

apis.EFSetDevVersion = function(protocol, cb){
	var self = this;
	try {
		if (!protocol.name||
	        typeof(protocol.name) !== 'string')
			throw new Error('__invalid_param');
		var name = protocol.name;
		var service = global.base.getServiceList('WA')[0];
		service.requestAction('getRequireVersion', {name : name}, function(err, iList, iSum){
			var iAck = {result : 'success', iList: iList, iSum: iSum};
			cb(err, iAck);
		});
	}catch(ex) {
		global.warn('EFSetDevVersion message: %s', ex.message);
		cb(ex)
	}
}

// user login: generate uid, add more info to session
apis.UserLogin = function(protocol, cb) {

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

