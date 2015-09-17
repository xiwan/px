'use strict'

var express = require('express');
var util = require('util');

var AppServer = exports.AppServer = function(portNo, commands) {
	var self = this;

	self.app = express();
	self.guestApi = [];
	self.app.configure(function(){
		self.app.use(express.favicon());
		self.app.use(express.logger('dev'));
		self.app.use(express.bodyParser());
	});
	self.app.listen(portNo);

    global.debug('starting up app-server, serving ' + ' on port: ' + portNo.toString());

    // register all get handlers
    commands['get'] && commands['get'].forEach(function(handler){
        self.app['get'](handler, function(req, res){
        	self.doAction('get', req, res);
        });
    });
    // register all post handlers
    commands['post'] && commands['post'].forEach(function(handler){
        self.app['post'](handler, function(req, res){
        	self.doAction('post', req, res);
        });
    });
};

AppServer.prototype.doAction = function(method, req, res) {
    var self = this;
    try {
        var name = req.url.replace('/', '');
        var requestAction = global.base['requestAction'];

        requestAction(name, method, req, res, function(err, ack) {
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

AppServer.prototype.sendErrorMsg = function(req, res, ex) {
    if (res) {
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({
            result : ex.message
        }));
    }
};

exports.createServer = function (portNo, commands) {
    return new AppServer(portNo, commands);
};
