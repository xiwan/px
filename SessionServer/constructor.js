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
		var portNum = parseInt(self.cfg.http.port) + self.idx;
		self.proxy = base.ProxyServer(portNum, { protocol:'http' });
		self.proxy.loadPolicy(commands);

	}catch (ex) {
		cb(ex);		
	}
};

module.exports.Constructor = Constructor;