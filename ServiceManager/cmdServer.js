'use strict';

var net = require('net');
var util = require('util');

var CmdServer = function(name, portNo, ipAddr) {
	ipAddr || (ipAddr = '127.0.0.1');

	this.portNo = portNo;
	this.ipAddr = ipAddr;

	this.server = null;
	this.clients = {};
	this.services = {};
	this.prompt = util.format("%s %s:%d", name, ipAddr, portNo);

	this.handler = {};
};

CmdServer.prototype.run = function(handler) {
	var self = this;
	global.debug('CmdServer.run. %s:%d', self.ipAddr, self.portNo);
	self.handler = handler;

	self.server = net.createServer(function(client){
		client.id = global.base.genGid();
		self.clients[client.id] = client; // cache the connection

		global.debug('CmdServer.run. server connected. id=%s', client.id);

		var lastMsg = '';
		client.on('end', function(){
            global.debug('CmdServer.run. server disconnected. id=%s', client.id);
            delete self.clients[client.id];
		});
		client.on('data', function(msg){
			var iCmd = msg.toString().trim();
            if (iCmd === '/') {
                msg = lastMsg;
                client.write(lastMsg + '\n\r');
            } else if (iCmd === 'exit') {
                client.emit('end');
                client.destroy();
                return;
            } else {
                lastMsg = msg;
            }
            self.onMsg(client, msg);
		});
		client._tid = setTimeout(function(){
			try {
                client.write(self.prompt);
                client._bFirst = false;
			} catch (ex) {
				global.warn('exception : %s', ex.message);
			}
		}, 100);
	});
	
	self.server.listen(self.portNo, self.ipAddr);
};

CmdServer.prototype.onMsg = function(client, msg) {
	client || (client = {write: function() {} });
	var self = this;
	var param = self.parseMsg(client, msg);
	var iFunction = self.handler[param.command];
	if ('function' !== typeof(iFunction)) {
        client.write(util.format('unregistered command : %s\n\r', param.command));
        client.write(self.prompt);
    } else {
    	iFunction(client, param, function(err, result) {
            try {
                if (err) {
                    global.warn('CmdServer.onMsg error:%s', err.toString());
                    if(client) client.write(err.toString());
                } else {
                    client.write(result);
                }
                !client.session && (client.write('\n\r' + self.prompt));
            } catch (ex) {
                global.warn('AppCmdServer.onMsg. error:%s', ex.message);
            }
    	});
    }
};

CmdServer.prototype.parseMsg = function(client, message){
	var param = message.toString().trim().split(' ');
	var iMsg = {
		command : param[0],
		id : client.id,
		subs : [],
	};
	var iLen = param.length;
	for (var i=1; i<iLen; i++) {
		var item = param[i].split('=');
        if (item.length !== 2) {
            iMsg.subs.push(param[i].trim());
        } else {
            iMsg[item[0]] = item[1];
        }
	}
	return iMsg;
};

module.exports.CmdServer = CmdServer;
	
