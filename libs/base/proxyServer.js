'use strict';

var http = require('http');
var util = require('util');
var events = require('events');
var url = require('url');
var zlib = require('zlib');

var ProxyServer = function (portNum, options) {
	var self = this;
	events.EventEmitter.call(self);

	self.server = self.createServer(options);

	self.server.listen(portNum);
	global.debug('ProxyServer.listen. %s.portNum:%s', options.protocol, portNum);
};
util.inherits(ProxyServer, events.EventEmitter);


ProxyServer.prototype.createServer = function (options) {
    var self = this;
    switch (options.protocol) {
        case 'http':
            return http.createServer(function(req, res) { self.webHandler(req, res); });
            break;
        case 'https':
        	break;
        default :
            throw new Error('__unsupported_protocol');
    }
};

/**
 * RESTful API Message Handler
 * @param req
 * @param res
 */
ProxyServer.prototype.webHandler = function (req, res) {
	var self = this;
	try {
		if (req.method != 'POST')
			throw new Error('__method_get');

		var action, body;

		action = url.parse(req.url).pathname;
		action = action.substr(1);
        // if (action.substr(0, 2) !== 'EF')
        //     throw new Error('__protocol_name');

        body = '';
        req.setMaxListeners(0);
        req.on('data', function(data) { body += data; });
        req.on('error', function(err) { self.sendHttpError(res, err); });
        req.on('end', function(){
        	decodeReq(body, function(err, message){
        		if (err){
        			self.sendHttpError(res, err);
        			return;
        		}
        		try {
        			message.__action = action;
        			message.__address = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        			//self.sendHttpResponse(res, {result: "success"});
        			self.emit('message', req, message, function(err, iAck){
                        if (err) {
                            global.warn('WebService.onRequest.emit action:%s, message:%s, err:%s', action, text, err.message);
                            global.warn(err.stack);
                            self.sendHttpError(res, err);
                        } else {
                            self.sendHttpResponse(res, iAck);
                        }        				
        			});
        		}catch (ex) {
        			self.sendHttpError(res, ex);
        		}
        	});
        });

	}catch(ex){

	}
};

ProxyServer.prototype.sendHttpResponse = function(res, body) {
	try{
		res.writeHead(200, {'Content-Type': 'text/plain'});
		encodeRes(body, function(err, data){
			body = null;
			err || res.end(data);
		});
	}catch(ex) {
		global.warn('ProxyServer.sendHttpResponse. error:%s', ex.message);
	}
};

ProxyServer.prototype.sendHttpError = function(res, err) {
	try{
		var body = {result: err.message};
		res.writeHead(200, {'Content-Type': 'text/plain'});
		encodeRes(body, function(err, data){
			err || res.end(data);
		});
	}catch(ex) {
		global.warn('ProxyServer.sendHttpError. error:%s', ex.message);
	}
};


function encodeRes(body, cb) {
	try {
		var json = JSON.stringify(body);
		zlib.gzip(json, function(err, data){
			cb(err, data.toString('base64'));
		});
	}catch (ex) {
		global.warn('encodeRes. error:%s', ex.message);
		cb(ex);
	}

}

function decodeReq(body, cb) {
	try {
		var buff = new Buffer(body, 'base64');
		zlib.gunzip(buff, function(err, data){
			cb(err, JSON.parse(data));
		});
	}catch (ex) {
		global.warn('decodeReq. error:%s', ex.message);
		cb(ex);
	}
}

exports.ProxyServer = ProxyServer;



