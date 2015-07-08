'use strict'

var dnode = require('dnode');
var net = require('net');
var util = require('util');

var Server = exports.Server = function(name, portNum, options) {
	var self = this;

	self.name = name;
	self.ipAddr = global.utils.getIPAddress();
	self.portNum = portNum;
	options.redis && (self.redis = options.redis);
	options.emitter && (self.emitter = options.emitter);
	self.key = util.format('%s:%s', self.ipAddr, portNum);

	self.rpc = net.createServer(function(client){
		client.setMaxListeners(0);

		var ipAddr = client.remoteAddress;
		var portNo = client.remotePort;

		global.debug('Server.connection. key:%s, fromIp:%s, fromPort:%s', self.name, ipAddr, portNo);

		client.on('end', function(){
            global.debug('Server.close. key:%s, fromIp:%s, fromPort:%s', self.name, ipAddr, portNo);
            client.removeAllListeners();
            client = null;			
		});

		var d = dnode({
            requestAction : function() { self.requestAction.apply(self, arguments); },
            requestMessage : function() { { self.requestMessage.apply(self, arguments); } }			
		});

		client.pipe(d).pipe(client);

	});

	global.debug('Server.listen. key:%s, ipAddr:%s, portNo:%s', self.name, self.ipAddr, self.portNum);

    self.rpc.listen(portNum, '0.0.0.0', function(err) {
        if (err) throw err;     //< throw uncaughtException to kill process

        self.redis && setInterval(function() {self.update();}, 100);
    });
};

/** */
Server.prototype.requestAction = function() {
    var self = this;
    self.emitter && self.emitter.emit('requestAction', arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
};


/** */
Server.prototype.requestMessage = function() {
    var self = this;
    self.emitter && self.emitter.emit('requestMessage', arguments[0], arguments[1], arguments[2], arguments[3], arguments[4], arguments[5]);
};

Server.prototype.end = function() {
    var self = this;
    try {
        self.removeAllListeners();
        self.rpc.close();
        self.rpc = null;
        global.debug('Server.end. name:%s, portNum:%s, ipAddr:%s', self.name, self.portNum, self.ipAddr);
    } catch (ex) {
        global.warn('Server.end. name:%s, portNum:%s, ipAddr:%s, ex:%s', self.name, self.portNum, self.ipAddr, ex.message);
    }
};

Server.prototype.update = function() {
    var self = this;
    try {
        var client = self.redis.get(self.name);
        client.hset(self.name, self.key, JSON.stringify({lastUpdateDate : new Date()}), function(err) {
            err && global.warn('Server.update. key:%s, err:%s', self.key, err.message);
        });
    } catch (ex) {
        global.warn('Server.update. key:%s, ex:%s', self.key, ex.message);
    }
};

exports.createObject = function(name, portNum, options) {
    return new Server(name, portNum, options);
};

