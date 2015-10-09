'use strict'

var util = require('util');
var __ = require('underscore');
var async = require('async');
var base = require('../libs/app_base');

var apis = require('./apis/main').apis;

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);

	this.timerFuncs = {};
	this.commands = require('./commands');
	this.clockINT = global.const.CLOCK_INT; // 50ms
};
util.inherits(Constructor, base.Constructor);

Constructor.prototype.run = function(cb) {
	var self = this;
	try {
		// init policy instance & load commands
		self.policy = base.Policy.createObject();
		self.overloading(apis, {});

		//init rpc server or client
		self.initForRPC(self.cfg.services[self.name].rpc, self.policy);

		self.timmerArray = [];
		for (var key in self.commands) {
			if (!self.timerFuncs[key]) {
				self.timerFuncs[key] = {};
			}
			self.timerFuncs[key].des = Math.ceil((self.commands[key] || self.clockINT)/self.clockINT);

			var makeTimerFunc = self.makeTimerObj(key);
			self.timmerArray.push(makeTimerFunc);
		}
		
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

Constructor.prototype.makeTimerObj = function (key, callback) {
	var self = this;
	return function(callback) {
		self.timerFuncs[key].des--;
		if (self.timerFuncs[key].des == 0) {
			if ( 'function' == typeof(self[key])) {
				self[key].call(self);
			}
			self.timerFuncs[key].des = Math.ceil((self.commands[key] || self.clockINT)/self.clockINT);	
		}					
	}
}


Constructor.prototype.onTimer = function(){
	var self = this;
	try {
		async.parallel(self.timmerArray);
	}catch (ex) {

	}
	//self.simScene();
};

module.exports.Constructor = Constructor;