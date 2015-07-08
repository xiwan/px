

'use strict';

var ini = require('ini');
var async = require('async');
var log4js = require('log4js');
var util = require('util');
var fs = require('fs');

var redisHash = require('./redisHashRing');
var rpcServer = require('./rpcServer');
var rpcClient = require('./rpcClient');

/**
* @mehtod Constructor
* @param {String} name: Process name
* @param {String} local: Local Property
*/
var Constructor = function (name, local) {

    global.utils = require('./utils');
    global.test = console.test;
    global.info = console.log;
    global.debug = console.log;
    global.warn = console.warn;
    global.error = console.error;

    this.logger = null;
    this.startDate = global.utils.toDateTime(new Date());
    this.name = name;
    this.idx = 0;

    this.property = {};         // common property
    this.local = local;         // local property

    this.versions = [];
    this.gids = null;
    this.cfg = null;

    this.waitForTerminate = 1;

    global.const = require('./const').Const;
}

Constructor.prototype.terminate = function(signal) {
    var self = this;
    self.onTerminated();
    setTimeout(function() {
        global.warn('%s.%s %s...', self.name, self.idx, signal);
        process.exit(0);
    }, self.waitForTerminate);
};


Constructor.prototype.onTerminated = function() {};

/**
* @method init
* 1. parse argv
* 2. get db connection info
* 3. init service based on config
*/
Constructor.prototype.init = function(cb) {
	var self = this;
	try {
        global.argv = require('optimist').argv;
        global.hostname = require('os').hostname(); // get current hostname
        global.base = self; // global.base is current object
        self.idx = global.argv.idx?global.argv.idx : 0;
        self.ipAddr = global.utils.getIPAddress();
        global.argv.cfg || (global.argv.cfg = '');

	    if (fs.existsSync(global.argv.cfg)) { // for sm process
	        var config = ini.parse(fs.readFileSync(global.argv.cfg, 'utf-8'));
	        self.cfg = config;
	        process.env.cfg = JSON.stringify(self.cfg);
	    } else { // for other processes
	        self.cfg = JSON.parse(process.env.cfg);
	    }

	    async.waterfall([
	    	function(callback) {self.initLogger(self.cfg.logs, callback)},
	    	function(callback) {self.initRedis(self.cfg.redis, callback)},
	    ], function(err){
	    	try {
	    		if (err) throw err;

			    process.on('SIGINT', function () { self.terminate('SIGINT'); });
				process.on('SIGTERM', function () { self.terminate('SIGTERM'); });
				process.on('uncaughtException', function(err){
					if (global.base && global.base.action) {

					}else {
		                global.error('-----------uncaughtException-BEGIN--------------');
		                global.error(err.stack);
		                global.error('-----------uncaughtException-END--------------');
		            }
		            self.terminate('SIG_ERR');
				});

			    cb(null);
	    	}catch (ex) {
	    		cb(ex)
	    	}
	    });


	}catch(ex) {
        global.warn(ex.stack);
        cb(ex);		
	}

};


Constructor.prototype.initLogger = function(cfg, cb) {
    var self = this;
    try {
        cfg.baseLogDir || (cfg.baseLogDir = '/tmp');
        log4js.loadAppender('file');
        var name = util.format('%s.%s', self.name, self.idx);
        var iLog = util.format('%s/%s.log', cfg.baseLogDir, name);

        log4js.addAppender(log4js.appenders.file(iLog,  log4js.layouts.basicLayout, 1024*1024*100, 5), name);

        self.logger = log4js.getLogger(name);
        self.logger.setLevel(cfg.level||'TRACE');

        global.test = function() { self.logger.trace.apply(self.logger, arguments); };
        global.info = function() { self.logger.info.apply(self.logger, arguments); };
        global.debug = function() { self.logger.debug.apply(self.logger, arguments); };
        global.warn = function() { self.logger.warn.apply(self.logger, arguments); };
        global.error = function() { self.logger.error.apply(self.logger, arguments); };

        cb(null);
    } catch (ex) {
        cb(ex);
    }
};

Constructor.prototype.initRedis = function(cfg, cb) {
	var self = this;
	try {
		if (!cfg) {
			cb(null);
			return;
		}

		self.redis = {};
		async.each(Object.keys(cfg), function(key, callback) {
			self.redis[key] = redisHash.createObject(cfg[key], key);
			self.redis[key].init(callback);
		}, cb);
		
	} catch (ex) {
		cb(ex)
	}
};

Constructor.prototype.initForRPC = function(property, emitter) {
	var self = this;
	self.rpc = {};
	var options = {redis: self.redis.system};
	console.log(property)
    if (property.client) {
        self.rpc.client = {};
        property.client.forEach(function(key) {
            self.rpc.client[key] = new rpcClient.createObject(key, options);
        });
    }

    if (property.server) {
        options.emitter = emitter;
        var portNum = parseInt(self.cfg.rpc.port) + self.idx;
        self.rpc.server = new rpcServer.createObject(self.name, portNum, options);
    }
};


module.exports.Constructor = Constructor;



