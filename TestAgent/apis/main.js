'use strict'
var http = require('http');
var zlib = require('zlib');
var WebSocket = require('ws');

var apis = exports.apis = {};

var ws = new WebSocket('ws://localhost:1438/');

ws.on('open', function open() {
	console.log('connected');
});

ws.on('error', function(err) {
    err && console.log(err.stack);
    cb && cb(err);
});

ws.on('close', function close() {
  	console.log('disconnected');
});

ws.on('message', function(data, flags) {
	apis.decodeReq(data.substr(1), function(err, iAck) {
		console.log(err, iAck);
	});
});

apis.wsRequest = function(action, protocol, cb) {
	var self = this;
	var body = {
		name : action,
		json : JSON.stringify(protocol),
	};
    self.encodeRes(body, function(err, data){
        if(err) {
           cb(err);
           return; 
        }
        ws.send(data);
        cb();
    });
};

apis.httpRequest = function(action, body, cb) {
	var self = this;
    var options = {
        hostname : 'localhost',
        port : 1438,
        method : 'POST',
        path: '/' + action
    };

    var req = http.request(options, function(res){
        res.setEncoding('utf8');
        var iMsg = '';
        res.on('data', function (chunk) {
            iMsg += chunk;
        });
        res.on('end', function() {
            self.decodeReq(iMsg, function(err, iAck){
                cb(err, iAck)
            });
        });

    });

    req.on('error', function(e) {
        console.error('action : %s, error : %s', action, e.toString());
        cb(e);
    });


    self.encodeRes(body, function(err, data){
        if(err) {
           cb(err);
           return; 
        }
        req.write(data);
        req.end();
    });
};

apis.encodeRes = function(body, cb) {
	try {
		var json = JSON.stringify(body);
		zlib.gzip(json, function(err, data){
			cb(err, data.toString('base64'));
		});
	}catch (ex) {
		global.warn('encodeRes. error:%s', ex.message);
		cb(ex);
	}

};

apis.decodeReq = function(body, cb) {
	try {
		var buff = new Buffer(body, 'base64');
		zlib.gunzip(buff, function(err, data){
			cb(err, JSON.parse(data));
		});
	}catch (ex) {
		global.warn('decodeReq. error:%s', ex.message);
		cb(ex);
	}
};