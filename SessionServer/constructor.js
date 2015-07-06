'use strict';

var base = require('../libs/app_base');
var util = require('util');
var __ = require('underscore');
var async = require('async');

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);
};
util.inherits(Constructor, base.Constructor);

Constructor.prototype.run = function(cb) {
	var self = this;
	try {
		var portNum = parseInt(self.cfg.http.port) + self.idx;
		self.proxy = new base.ProxyServer(portNum, { protocol:'http' });
		self.proxy.on('message', function(client, message, cb){
			console.log(message);
			cb(null, {result: 'success', msg: message});
		});

	}catch (ex) {
		cb(ex);		
	}
};

module.exports.Constructor = Constructor;