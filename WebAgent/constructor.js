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
		self.policy = base.Policy.createObject();
		self.overloading(apis, commands);

		//init rpc server or client
		self.initForRPC(self.cfg.services[self.name].rpc, self.policy);

		// html viewer
		var server = base.HttpServer.createServer({
			root : __dirname + '/public',
			cache : 10,
			showDir : false,
			autoIndex : false
		});

		var portNo = parseInt(self.cfg.services[self.name].webPortNo);
        server.listen(portNo, '0.0.0.0', function() {
            global.warn('starting up http-server, serving '
                + '/public'
                + ' on port: '
                + portNo.toString());
        });
	
	} catch (ex) {
		cb(ex)
	};
};

module.exports.Constructor = Constructor;