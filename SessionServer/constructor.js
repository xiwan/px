'use strict';

var util = require('util');
var __ = require('underscore');
var async = require('async');

var base = require('../libs/app_base');
var commands = require('./commands');
var apis = require('./apis/main').apis;

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);	
};
util.inherits(Constructor, base.Constructor);

Constructor.prototype.run = function(cb) {
	var self = this;
	try {
		
		// init policy instance & load commands
		self.policy = base.Policy.createObject();
		self.overloading(apis, commands);

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
		cb(null);
	}catch (ex) {
		cb(ex);		
	}
};

Constructor.prototype.notifyUsers = function(protocol, cb){
	var self = this;
	if (__.size(global.base.users)) {
		var message = {};
		message.uidList = Object.keys(global.base.users);
		message.body = protocol.data;
		message.name = protocol.name;
		self.channel.sendToMultiClient(message);					
	}

	cb(null, {result: 'success'});
}

module.exports.Constructor = Constructor;