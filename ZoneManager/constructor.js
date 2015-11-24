'use strict'

var util = require('util');
var __ = require('lodash');
var async = require('async');
var base = require('../libs/app_base');
var commands = require('./commands');
var apis = require('./apis/main').apis;

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);
	this.zoneDB = null;
	this.sqls = require('./sqls');
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
		self.zoneDB = base.MysqlConn.createObject(global.base.cfg.mysql, 'zoneDB');
	
	} catch (ex) {
		cb(ex)
	};
};

Constructor.prototype.getServerZoneList = function(cb) {
	var self = this;
	try {
		global.base.zoneDB.use('slave');
		global.base.zoneDB.execute(self.sqls.getServerZoneList(), function(err, results) {
            var result = err ? [] : results;
            cb(err, result);
		});
	} catch (ex) {
		cb (ex)
	};
};

Constructor.prototype.getServerByGroupid = function(gid, cb) {
    var self = this;
    try {
    	global.base.zoneDB.use('slave');
		global.base.zoneDB.execute(self.sqls.getServerByGroupId(gid), function(err, results) {
            var result = err ? [] : results;
            cb(err, result);
		});
    } catch (ex) {
        cb(ex);
    }
};

module.exports.Constructor = Constructor;