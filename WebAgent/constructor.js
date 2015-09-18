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
};
util.inherits(Constructor, base.Constructor);

Constructor.prototype.run = function(cb) {
	var self = this;
	try {
		// init policy instance & load commands
		// self.policy = base.Policy.createObject();
		self.overloading(apis, {});

		// init rpc server or client
		// self.initForRPC(self.cfg.services[self.name].rpc, self.policy);

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


module.exports.Constructor = Constructor;