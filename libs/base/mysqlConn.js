'use strict'

var async      = require('async');
var mysql      = require('mysql');
var util       = require('util');
var __         = require('underscore');

var Table      = require('./mysqlTable');

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
			database : cfg[domain].database || cfg.database	// use domain or default database	
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

    self.use('master');
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

ConnectionMgr.prototype.init = function(dictionary){
	var self = this;
	try {
		self.tables = dictionary;
		if (self.tables.length > 0) {
			self.key = self.tables[0].key;
			self.names = [];
			self.tables.forEach(function(item){
				self.names.push(item.table);
			})
		}
	}catch (ex) {
		global.error('ConnectionMgr.init error: %s', ex.message);
	}
};

// find all related data in one domain by key, and then cache the results
ConnectionMgr.prototype.get = function(key, cb) {
	var self = this;
	try {
		var iKey = key;
		if (typeof(iKey) === 'string') iKey = util.format('"%s"', iKey);

        var qryList = [];
        self.tables.forEach(function(item) {
            qryList.push(util.format('select * from %s where %s = %s', item.table, self.key, iKey));
        });

        self.execute(qryList, function(err, results){
        	if (err) {
        		cb(err);
        		return;
        	}
        	// cache the results
        	self.onAddCacheMem(key, results, cb);
        });
	}catch (ex) {
		cb(ex)
	}
};

ConnectionMgr.prototype.onAddCacheMem = function(key, results, cb) {
	var self = this;
	try {
		var obj = new Table(self);
		obj.init(key, self.tables, results);
		cb(null, obj);
	}catch (ex) {
		global.warn(ex.stack);
		cb(ex);
	}
};

// find all related data in one domain by key, but no cache
ConnectionMgr.prototype.getTables = function(key, cb) {
    var self = this;
    try {
        var iKey = key;
        if (typeof(iKey) === 'string') iKey = util.format('"%s"', iKey);

        var qryList = [];
        self.tables.forEach(function(item) {
            qryList.push(util.format('select * from %s where %s = %s', item.table, self.key, iKey));
        });

        self.execute(qryList, function(err, results) {
            var iData = {};
            if (!err) {
                results.forEach(function(rows, idx) {
                    var name = self.tables[idx].table;
                    iData[name] = rows;
                })
            }
            cb(err, iData);
        });
    } catch (ex) {
        cb(ex);
    }
};

/**
* @mehtod: find
* @params: where, tables, [cols], cb
* @where:  name [in | nin | neq | is not null | op]=> value
*/
ConnectionMgr.prototype.finds = function() {
	var self = this;
    if (arguments.length < 3)
        throw new Error('invalid_arguments');
    var where = arguments[0];
    var tables = arguments[1];
    var cb = null, cols = null;
    // max 4 params supported
    if (arguments.length == 3) cb = arguments[2];
    else {
        cols = arguments[2];
        cb = arguments[3];
    }

    try {
    	var qryList = [];
    	// set up talbe target: one or many
    	var target = null;
    	if (tables && tables.length>0) target = tables;
    	else target = self.names;

    	var searchQry = '';
    	if (where) {
    		var iWhere = [];
    		where.forEach(function(item){
    			item.op || (item.op = '=');
    			var _where = '';
    			switch(item.op){
    				case 'in' : _where = util.format('`%s` in (%s)', item.name, item.value.join(', ')); break;
    				case 'nin' : _where = util.format('`%s` not in (%s)', item.name, item.value.join(', ')); break;
    				case 'neq' : _where = util.format('`%s` <> %s', item.name, item.value); break;
    				case 'is not null' : _where = util.format('`%s` is not null', item.name); break;
    				default : _where = util.format('`%s` %s "%s"', item.name, item.op, item.value); break;
    			}
    			iWhere.push(_where);
    		});
    		searchQry = util.format('where %s',  iWhere.join('  AND '));
    	}

        var columnQry = '*';
        if(cols){
            if(cols.length > 0){
                var iCols = [];
                cols.forEach(function(col){
                    if(cols === '') return;
                    iCols.push(col);
                });
                columnQry = iCols.join(', ');
            }
        }

        target.forEach(function(name) {
            qryList.push(util.format('select %s from %s %s', columnQry, name, searchQry));
        });
        
        self.execute(qryList, function(err, results) {
            // if (!err) {
            //     results.splice(0, 1);
            //     results.splice(results.length-1, 1);
            // }
            return cb(err, results);
        });

    }catch (ex) {
    	cb(ex);
    }

};


// execute formatted query
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

/**
* @mehtod: executeTrans
* @params: qry
* @qry:  string
*        object {sql: string, data: object}
*        array
*/
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
                            if (__.isObject(_qry) && _qry.sql &&_qry.data) {
                                connection.query(_qry.sql, _qry.data, function(err) {
                                    err && console.dir(_qry);
                                    callback(err);
                                });
                            }else {
                                connection.query(_qry, function(err) {
                                    err && console.dir(_qry);
                                    callback(err);
                                });                                
                            }

						}, function(err){
							self.releaseTrans(connection, begin, err, cb);
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

/** 
* advanced qry with sql and data props
*/
ConnectionMgr.prototype.executeAdvTrans = function(qry, cb) {
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
                            connection.query(_qry.sql, _qry.data, function(err) {
                                err && console.dir(_qry);
                                callback(err);
                            });
                        }, function(err){
                            self.releaseTrans(connection, begin, err, cb);
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