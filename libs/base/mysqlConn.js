'use strict'

var async      = require('async');
var mysql      = require('mysql');
var util       = require('util');
var __         = require('underscore');

var ConnectionMgr = function(cfg, domain) {
	var self = this;

	if (cfg) {
		var poolCluster = mysql.createPoolCluster();
		var masterArr = cfg.master[0].split(":");
		var masterConfig = {
			host : masterArr[0],
			port : masterArr[1],
			user : masterArr[2],
			password : masterArr[3]
		}; // always have one master
		poolCluster.add('MASTER', masterConfig);

		cfg.slave.forEach(function(item, idx){
			var slaveArr = item.split(":");
			var slaveConfig = {
				host : slaveArr[0],
				port : slaveArr[1],
				user : slaveArr[2],
				password : slaveArr[3]				
			};
			poolCluster.add('SLAVE' + idx, slaveConfig);
		})
		self.setConnection(poolCluster);
        self.tables = null;
        self.names = null;
        self.key = '';
        self.domain = domain ? domain : '*';
	}

};


ConnectionMgr.prototype.setConnection = function(pool) {
    var self = this;
    self.pool = pool;

    self.pool.on('remove', function(nodeId){
    	global.debug('removed node : %d', nodeId);
    });

    self.pool.on('connection', function(client) {
        client.query('SET SESSION auto_increment_increment=1');
        global.debug('query.on.connection');
    });

    self.pool.on('enqueue', function () {
        global.debug('Waiting for available connection slot');
    });
};


exports.createObject = function (property, domain) {
    return new ConnectionMgr(property, domain);
};