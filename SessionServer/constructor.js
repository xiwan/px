'use strict';

var base = require('../libs/app_base');
var util = require('util');
var __ = require('underscore');
var async = require('async');
var commands = require('./commands');

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);	
};
util.inherits(Constructor, base.Constructor);

Constructor.prototype.run = function(cb) {
	var self = this;
	try {
		// init policy instance & load commands
		self.policy = base.Policy.createObject();
		self.policy.load(self, commands);
		// init http server & ws server as front
		var portNo = parseInt(self.cfg.http.port) + self.idx;
		self.proxy = base.ProxyServer(portNo, { protocol:'http' });
		self.proxy.on('message', function(client, message, cb){ 
			self.policy.emit('message', client, message, cb); 
		});

		self.channel = base.Channel.createObject(self.policy);
		self.channel.prepare();
		// init rpc
		self.initForRPC(self.cfg.services[self.name].rpc, self.policy);

	}catch (ex) {
		cb(ex);		
	}
};

// client login: generate raw session
Constructor.prototype.EFClientLogin = function(protocol, cb) {
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
Constructor.prototype.EFUserLogin = function(protocol, cb) {

};

// check crc: verify clients master data
Constructor.prototype.EFCheckTableCrc = function(protocol, cb) {

};

Constructor.prototype.EFUserSocketLogin = function(socket, protocol, cb) {
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


Constructor.prototype.EFHeartBeat = function(socket, protocol, cb) {
	var now = new Date();
	var session = protocol.__session;
        // socket redirection..
        cb(null, { result : 'success', serverTime : now });
};


module.exports.Constructor = Constructor;