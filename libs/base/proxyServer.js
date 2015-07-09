'use strict';

var http = require('http');
var util = require('util');
var events = require('events');
var url = require('url');
var zlib = require('zlib');

var ProxyServer = function (portNum, options) {
	events.EventEmitter.call(this);
	
	var self = this;

	self.users = {};

	self.server = self.createServer(options);
	self.server.listen(portNum);

	var WebSocketServer = require('ws').Server;
	self.socket = new WebSocketServer({ server : self.server });
	self.socket.on('connection', function(socket) { self.socketRequest(socket) }) ;
	self.socket.on('error', function(error) {}) ;

	global.debug('ProxyServer.listen. %s.portNum:%s', options.protocol, portNum);
	
};
util.inherits(ProxyServer, events.EventEmitter);


ProxyServer.prototype.createServer = function (options) {
    var self = this;
    switch (options.protocol) {
        case 'http':
            return http.createServer(function(req, res) { 
            	self.webHandler(req, res);
            });
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
        			self.emit('message', req, message, function(err, iAck){
                        if (err) {
                            global.warn('WebService.onRequest.emit action:%s, message:%s, err:%s', action, JSON.stringify(message), err.message);
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
		self.sendHttpError(res, ex);
	}
};

ProxyServer.prototype.socketRequest = function(socket) {
	var self = this;
	try {
		var req = socket.upgradeReq;
		socket.remoteAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
		global.debug(socket.protocol, req.headers.origin);
		
        // if (socket.protocol !== 'user-event-socket' || req.headers.origin !== 'EvFun-DH') {
        //     global.warn('socket.error. peer:%s, protocol:%s, origin:%s, error:__invalid_request', socket.remoteAddress, connection.protocol, req.headers.origin);
        //     socket.close();
        //     return;
        // }

		socket.__id = global.base.genGid();
		self.users[socket.__id] = socket;

		// socket.__timeId = setTimeout(function(){
		// 	if (socket) {
  //               global.warn('socket.error. peer:%s, error:__expired_login_time', socket.remoteAddress);
  //               socket.close();
		// 	}
		// }, 5000);

		socket.on('message', function(message, flag){
			self.socketHandler(socket, message, flag);
		});
		// customized event: redirect
		socket.on('redirect', function(action, message) { 
			self.sendWebSocket(socket, action, message); 
		});

		socket.on('close', function(code){
			try {
				if (!socket) return;
				global.warn('socket.onClose code:%s', code);
				// handle channels
				//global.base.socketCloseEvent(socket);
				socket.removeAllListeners();
                delete self.users[socket.__id];
                socket = null;
			}catch(ex) {
				global.warn('socket.socketRequest.close ex:%s', ex.message);
			}
		});

        socket.on('error', function(err) {
            if (err && err.message) {
                global.warn('socket.error. id:%s, peer:%s, error:%s', socket.__id, socket.remoteAddress, err.message);
                err.message != 'read ECONNRESET' && global.warn(err.stack);
            }
        });

	}catch(ex) {
		global.warn('socket.socketRequest. ex:%s', ex.message);
	}
};

ProxyServer.prototype.socketHandler = function (socket, message, flag) {
	var self = this;
	try {
        if (flag.binary){
        	throw new Error('__web_data_type');
        } // dont hanlde binary here
		
		decodeReq(message, function(err, iMsg){
			try {
				if (err) throw err;

                if (!iMsg || !iMsg.name || !iMsg.json)
                    throw new Error('__protocol_format');

                var protocol = JSON.parse(iMsg.json);
                protocol.__action = iMsg.name;
                socket.__appSessionKey && (protocol.appSessionKey = socket.__appSessionKey);
                var timeId = setTimeout(function() {
                    socket.emit('error', new Error('__api_expired'));
                    timeId = 0;
                }, 1000 * 10);

                self.emit('message', socket, protocol, function(err, iAck){
                	if (timeId == 0) return;
                	clearTimeout(timeId);
                	if (err) {
                		socket.emit('error', err);
                		self.sendWebSocket(socket, iMsg.name, { result : err.message });
                	}else {
                		iAck && self.sendWebSocket(socket, iMsg.name, iAck);
                	}
                });
			}catch(ex) {
                global.warn('ProxyServer.socketHandler.gunzip. ex:%s', ex.message);
                socket.emit('error', ex);
			}
		});      

	}catch(ex) {
        global.warn('ProxyServer.socketHandler.message. ex:%s', ex.message);
        socket.emit('error', ex);		
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

/** send web socket by zip */
ProxyServer.prototype.sendWebSocket = function(socket, action, iMsg) {
	try {
		var message = {
			name : action,
			json : JSON.stringify(iMsg)
		};

		encodeRes(message, function(err, data){
			try {
                if (err) throw err;
                socket.send('1' + data);
			}catch (ex) {
				global.warn('ProxyServer.sendWebSocket. name:%s, error:%s', iMsg.name, ex.message);
			}
			message = null;
			data = null;
		});

	}catch(ex){
		global.warn('ProxyServer.sendWebSocket. name:%s, error:%s', iMsg.name, ex.message);
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

exports.ProxyServer = function (portNum, options) { 
	return new ProxyServer(portNum, options);
}



