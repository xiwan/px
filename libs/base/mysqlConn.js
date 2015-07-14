'use strict'

var async      = require('async');
var mysql      = require('mysql');
var util       = require('util');
var __         = require('underscore');

var ConnectionMgr = function(cfg, domain) {
	var self = this;

	self.poolCluster = null;
	if (cfg.database && cfg.master && cfg.slave) {
		var poolCluster = mysql.createPoolCluster();
		var masterConfig = {
			host : cfg.master.host,
			port : cfg.master.port,
			user : cfg[cfg.database].user,
			password : cfg[cfg.database].password,
			database : domain || cfg.database		
		}// always have one master
		poolCluster.add('MASTER', masterConfig);

		for (var i=0; i<cfg.slave.num; i++) {
			var slaveConfig = {
				host : cfg.slave.host,
				port : cfg.slave.port,
				user : cfg[cfg.database].user,
				password : cfg[cfg.database].password,
				database : domain || cfg.database	
			}
			var idx = i+1;
			poolCluster.add('SLAVE' + idx, slaveConfig);
		}

		self.setConnection(poolCluster);
	}

    self.tables = null;
    self.names = null;
    self.key = '';
    self.domain = domain ? domain : '*';

};

ConnectionMgr.prototype.use = function(pattern) {
	var self = this;
	return self.poolCluster.of(pattern.toUpperCase() + '*', 'RR');
};

ConnectionMgr.prototype.setConnection = function(poolCluster) {
    var self = this;
    self.poolCluster = poolCluster;

    self.poolCluster.on('remove', function(nodeId){
    	global.debug('removed node : %d', nodeId);
    });

    // self.poolCluster.on('connection', function(client) {
    //     client.query('SET SESSION auto_increment_increment=1');
    //     global.debug('query.on.connection');
    // });

    // self.poolCluster.on('enqueue', function () {
    //     global.debug('Waiting for available connection slot');
    // });
};

exports.createObject = function (property, domain) {
    return new ConnectionMgr(property, domain);
};