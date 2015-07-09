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
		self.policy = base.Policy.createObject();
		self.policy.loadPolicy(self, commands);

		self.initForRPC(self.cfg.services[self.name].rpc, self.policy);
	}catch (ex) {
		cb(ex);		
	}

};

Constructor.prototype.testABC = function(protocol, cb) {
	var msg = 'hey, i am in process UD:)';
	global.debug(msg);
	cb(null, {msg: msg})
}

module.exports.Constructor = Constructor;