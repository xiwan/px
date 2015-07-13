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

		self.initForRPC(self.cfg.services[self.name].rpc, self.policy);

	}catch (ex) {
		cb(ex);		
	}
};



// overwrite policy 
Constructor.prototype.iUser = function(iList) {
	var self = this;

	iList.forEach(function(cmd) {
		self.policy.parser[cmd] = function(client, protocol, cb) {

			async.waterfall([
				function(callback) { callback(); },
			], function(err){
				cb(err, {msg: 'test33'});
			});

		};
	});
};


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


module.exports.Constructor = Constructor;