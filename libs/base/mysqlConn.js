'use strict'

var async      = require('async');
var mysql      = require('mysql');
var util       = require('util');
var __         = require('underscore');

var ConnectionMgr = function(cfg, domain) {
	var self = this;

	self.poolCluster = null;
	self.pool = null;
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

		cfg.slave.conn.forEach(function(conn, idx){
			var slaveConfig = {
				host : conn.split(':')[0],
				port : conn.split(':')[1],
				user : cfg[cfg.database].user,
				password : cfg[cfg.database].password,
				database : cfg[domain].database || cfg.database	
			}
			poolCluster.add('SLAVE' + (idx+1), slaveConfig);
		});

		self.setConnection(poolCluster);
	}

    self.tables = null;
    self.names = null;
    self.key = '';
    self.domain = domain ? domain : '*';

};

ConnectionMgr.prototype.use = function(pattern) {
	var self = this;
	self.pool = self.poolCluster.of(pattern.toUpperCase() + '*', 'RR');
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

ConnectionMgr.prototype.execute = function(qry, cb) {
	var self = this;
	try {
		var qryList = util.isArray(qry) ? qry : [qry];
		self.pool.getConnection(function(err, connection){
			if (err) {
				cb(err);
				return;
			}
			qryList.splice(0, 0, 'SET SESSION TRANSACTION ISOLATION LEVEL READ UNCOMMITTED ;');
            qryList.push('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ ;');

            async.map(qryList, function(qry ,callback){
            	if (typeof qry == 'string') {
            		connection.query(qry, callback);
            	}else {
            		connection.query(qry.sql, qry.data, callback);
            	}
            }, function(err, results){
            	connection.release();
                results.splice(0, 1);
                results.splice(results.length-1, 1);
                cb(err, results[0]);
                err && console.dir(qryList);
            });

		});

	}catch (ex) {
		cb(ex);
	}
};

ConnectionMgr.prototype.executeTrans = function(qry, cb) {
	var self = this;
	try {
		var qryList = util.isArray(qry) ? qry : [qry];
		var begin = new Date();
		self.pool.getConnection(function(err, connection) {
			try {
				if (err) throw err;
				connection.beginTransaction(function(err){
					try {
						async.eachSeries(qryList, function(_qry, callback){
							connection.query(_qry, function(err) {
                                err && console.dir(_qry);
                                callback(err);
							});
						}, function(err){
							self.releaseTrans(connection, begin, ex, cb);
						});
					}catch (ex) {
						self.releaseTrans(connection, begin, ex, cb);
					}
				});
			}catch (ex) {
				cb(ex);
			}
		});
	}catch (ex) {
		cb(ex);
	}
};

ConnectionMgr.prototype.releaseTrans = function(connection, begin, err, cb) {
	var self = this;
	try {
		if (err) throw err;
		connection.commit(function(err) {
			if (err){
		        connection.rollback(function() {
		            connection.release();
		            cb(ex);
		        });
			}else {
                connection.release();
                cb(null);
			}
		});
	}catch (ex) {
        connection.rollback(function() {
            connection.release();
            cb(ex);
        });
	}
};

exports.createObject = function (property, domain) {
    return new ConnectionMgr(property, domain);
};