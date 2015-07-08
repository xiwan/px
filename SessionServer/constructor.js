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
		self.policy.loadPolicy(self, commands);
		// init http server
		var portNo = parseInt(self.cfg.http.port) + self.idx;
		self.proxy = base.ProxyServer(portNo, { protocol:'http' });
		self.proxy.on('message', function(client, message, cb){ 
			self.policy.emit('message', client, message, cb); 
		});

		self.initForRPC(self.cfg.services.SS.rpc, self.policy);
		
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

module.exports.Constructor = Constructor;