'use strict'

var util = require('util');
var __ = require('underscore');
var async = require('async');
var base = require('../libs/app_base');
var commands = require('./commands');
var apis = require('./apis/main').apis;

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);

	this.clockINT = global.const.CLOCK_INT; // 50ms
};
util.inherits(Constructor, base.Constructor);

Constructor.prototype.run = function(cb) {
	var self = this;
	try {
		// init policy instance & load commands
		self.policy = base.Policy.createObject();
		self.overloading(apis, commands);

		//init rpc server or client
		self.initForRPC(self.cfg.services[self.name].rpc, self.policy);

		var simInterval = function() {
			setTimeout(function(){
				self.onTimer();
				simInterval(); // call itself
			}, self.clockINT );
		}

		setTimeout(simInterval, 5000);

		cb(null);
	} catch (ex) {
		cb(ex)
	};
};


Constructor.prototype.onTimer = function(){
	var self = this;
	self.simMonster();
};

module.exports.Constructor = Constructor;