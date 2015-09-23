'use strict'

var util = require('util');
var __ = require('underscore');
var async = require('async');
var base = require('../libs/app_base');
var commands = require('./commands');
var apis = require('./apis/main').apis;

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);

    this.service = null;
    this.parser = null;
    this.platform = null;
    this.account = null;
    this.monitor = null;
    this.uploads = [];
	this.jobList = {};
    this.dataVersions = [];
    this.rootPath = '';
};
util.inherits(Constructor, base.Constructor);

Constructor.prototype.run = function(cb) {
	var self = this;
	try {
		// init policy instance & load commands
		self.policy = base.Policy.createObject();
		self.overloading(apis, {});

		// init rpc server or client
		self.initForRPC(self.cfg.services[self.name].rpc, self.policy);

        var conf = self.cfg.services[self.name];
		// ftp configuration
		var ftpInfos = conf.ftp.split(':');
		self.ftpConfig = {
            host : ftpInfos[0],
            port : ftpInfos[1],
            user : ftpInfos[2],
            password : ftpInfos[3]
		};

        // express server
        var bindPortNo = parseInt(conf.bindPortNo);
        self.service = base.AppServer.createServer(bindPortNo, commands);

		// html viewer
        self.rootPath = __dirname;
        var webPortNo = parseInt(conf.webPortNo);
		var server = base.HttpServer.createServer({
			root : __dirname + '/public',
			cache : 10,
			showDir : false,
			autoIndex : false
		}, webPortNo);

        // server.listen(portNo, '0.0.0.0', function() {
        //     global.debug('starting up http-server, serving ' + '/public' + ' on port: ' + portNo.toString());
        // });

        self.getVersionsFromDB(function(err) {
            global.debug('WebAgentServer.run. success');
            cb(err);
        });

	} catch (ex) {
		cb(ex)
	};
};

Constructor.prototype.requestAction = function(name, method, req, res, cb){
    var self = global.base;
	if (typeof(self[name]) != 'function') {
		return cb(new Error('unregistered_open_api'));
	}
	var iAction = self[name];

    if (method === 'get') {
        iAction(req, res);
        return;
    }
    // for posting method
    iAction(req, function(err, ack){
    	cb(err, ack);
    })
};

Constructor.prototype.addAsyncJob = function(action) {
    var self = this;
    try {
        var jobItem = {
            id : self.genGid(),
            state : 1,      // 1: Preparing, 2: Working, 3: Finished
            action : action,
            status : {}
        };
        self.jobList[jobItem.id] = jobItem;
        return jobItem;
    } catch (ex) {
        global.warn('Constructor.addAsyncJob. error:%s', ex.message);
        return null;
    }
};

Constructor.prototype.getVersionsFromDB = function(cb) {
    var self = this;
    try {
        var iQry = [];
        iQry.push('select x.sheet, x.category, y.version, y.json, y.crc, x.excel as name, y.date from T_APP_DATA x');
        iQry.push('join (select * from T_APP_DATA_VERSION) y');
        iQry.push('on (x.appId = y.appId and x.sheet = y.sheet and x.maxVersion = y.version)');
        iQry.push(util.format('where x.appId = "%s"', global.const.appId));
        self.systemDB.execute(iQry.join(' '), function(err, results) {
            try {
                if (err) throw err;
                self.dataVersions = results;
                cb(null);
            } catch (ex) {
                cb(ex);
            }
        });
    } catch (ex) {
        cb(ex);
    }
};

Constructor.prototype.getCurrentVersion = function(cb){
    var self = this;
    try {
        var iList = [], iSum = 0;
        global.base.dataVersions.forEach(function(item) {
            iList.push({
                category : item.category,
                sheet : item.sheet,
                version : item.version
            });
            iSum += item.version;
        });
        cb(null, iList, iSum);
    }catch(ex) {
        cb(ex);
    }
};


module.exports.Constructor = Constructor;