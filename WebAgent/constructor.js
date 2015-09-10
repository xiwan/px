'use strict'

var util = require('util');
var __ = require('underscore');
var async = require('async');
var director = require('director');
var base = require('../libs/app_base');
var commands = require('./commands');
var apis = require('./apis/main').apis;

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);

    this.service = null;
    this.router = null;
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

		// init rpc server or client
		// self.initForRPC(self.cfg.services[self.name].rpc, self.policy);

		// ftp configuration
		var ftpInfos = self.cfg.services[self.name].ftp.split(':');
		self.ftpConfig = {
            host : ftpInfos[0],
            port : ftpInfos[1],
            user : ftpInfos[2],
            password : ftpInfos[3]
		};
		this.router = new director.http.Router();
		// html viewer
		var server = base.HttpServer.createServer({
			root : __dirname + '/public',
			cache : 10,
			showDir : false,
			autoIndex : false
		}, this.router);

		var portNo = parseInt(self.cfg.services[self.name].webPortNo);
        server.listen(portNo, '0.0.0.0', function() {
            global.debug('starting up http-server, serving ' + '/public' + ' on port: ' + portNo.toString());
        });
        // url starting with wb treated as post reqs
	    this.router.post('/wb*', function () {
		  	self.doAction('post', this.req, this.res);
		});
	    // url starting with api treated as post reqs
	    this.router.get('/api*', function () {
		  	self.doAction('get', this.req, this.res);
		});

		this.router.get('/ApiConvertLocalization', function(){
			self.doAction('get', this.req, this.res);
		})

	} catch (ex) {
		cb(ex)
	};
};

Constructor.prototype.requestAction = function(self, name, method, req, res, cb){

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

Constructor.prototype.doAction = function(method, req, res) {
    var self = this;
    try {
        var name = req.url.replace('/', '');
        var requestAction = self['requestAction'];

        requestAction(self, name, method, req, res, function(err, ack) {
        	if (err) {
                self.sendErrorMsg(req, res, err);
                return;
        	}

        	if (ack) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(ack));
        	}
        });
    } catch (ex) {
        global.warn('HttpServer.doAction. url:%s, error:%s', req.url, ex.message);
        console.log(ex.stack);
    };
};

Constructor.prototype.sendErrorMsg = function(req, res, ex) {
    if (res) {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({
            result : ex.message
        }));
    }
};


module.exports.Constructor = Constructor;