'use strict';

var util = require('util');
var __ = require('lodash');
var async = require('async');

var base = require('../libs/app_base');
var commands = require('./commands');
var apis = require('./apis/main').apis;
var gameSystem = require('./model/game_system');

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);
};
util.inherits(Constructor, base.Constructor);

Constructor.prototype.run = function(cb) {
	var self = this;
	try {
		self.policy = base.Policy.createObject();
		self.overloading(apis, commands);

		self.initForRPC(self.cfg.services[self.name].rpc, self.policy);

		self.gameSystem = gameSystem.createObject(global.base.cfg.mysql);

		cb(null);
	}catch (ex) {
		cb(ex);		
	}

};


module.exports.Constructor = Constructor;