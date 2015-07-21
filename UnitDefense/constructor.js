'use strict';

var base = require('../libs/app_base');
var commands = require('./commands');
var gameSystem = require('./model/game_system');
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
		self.policy = base.Policy.createObject();
		self.policy.load(self, commands);

		self.initForRPC(self.cfg.services[self.name].rpc, self.policy);

		self.gameSystem = gameSystem.createObject(global.base.cfg.mysql);
	}catch (ex) {
		cb(ex);		
	}

};

Constructor.prototype.testABC = function(protocol, cb) {
	var self = this;
	self.gameSystem.testABC(function(err, results){
		cb(err, {msg: results})		
	});

};

Constructor.prototype.test1 = function(protocol, cb) {
	var self = this;
	self.gameSystem.test1(function(err, results){
		cb(err, {msg: results})		
	});	
}

module.exports.Constructor = Constructor;