'use strict'

var util = require('util');
var __ = require('underscore');
var async = require('async');
var base = require('../libs/app_base');
var commands = require('./commands');
var apis = require('./apis/main');

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);

	this.clockTT = 1000; // 50ms
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

		self.onTimer();
		
		cb(null);
	} catch (ex) {
		cb(ex)
	};
};


Constructor.prototype.onTimer = function(){
	var self = this;
	setTimeout(function(){

		self.onTimer();
	}, self.clockTT);
};

module.exports.Constructor = Constructor;