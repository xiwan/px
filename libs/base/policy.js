'use strict'

var async = require('async');
var iSession = require('./session');
var util = require('util');
var events = require('events');

var Policy = function (external) {
	events.EventEmitter.call(this);

	var self = this;
	self.parser = {};
	self.session = iSession.createObject();

	self.on('message', function() { self.onMessage.apply(self, arguments); });
    self.on('requestAction', function() { self.requestAction.apply(self, arguments); });
    self.on('requestMessage', function() { self.requestMessage.apply(self, arguments); });

};
util.inherits(Policy, events.EventEmitter);

Policy.prototype.loadPolicy = function(owner, commands) {
    var self = this;
    var keys = Object.keys(commands);

    keys.forEach(function(key){
        var iList = commands[key];
        if (owner[key]){
            owner[key](iList);
        }else if (self[key]) {
            self[key](iList);
        }else {
            throw new Error('__policy_not_found');
        }
    }); 
};

Policy.prototype.onMessage = function(client, message, cb) {
	var self = this;
	try {
        var iAction = self.parser[message.__action];
        if (typeof(iAction) !== 'function')
            throw new Error('__api_unregistered');

        var begin = new Date();
        var timeId = setTimeout(function(){
        	self.onError(new Error('__api_expired'), message, cb);
        	cb = null;
        }, 1000 * 30);

        iAction.call(self, client, message, function(err, iAck){
        	clearTimeout(timeId);
        	try {
        		if (err) throw err;
        		cb(null, iAck);

                if (message.__session && message.__session.uid) {
                    global.test('ApiParser.onMessage. uid:%s, action:%s', message.__session.uid, message.__action);
                } else {
                    global.test('ApiParser.onMessage. action:%s', message.__action);
                }                   
        	} catch (ex) {
        		self.onError(ex, message, cb);
        	}
        });

	}catch (ex) {
		self.onError(ex, message, cb);
	}
};

/** */
Policy.prototype.onError = function(error, message, cb) {
    try {
        if (message.__session && message.__session.uid) {
            global.warn('ProxyServer.onError. uid:%s, action:%s, error:%s', message.__session.uid, message.__action, error.message);
        } else {
            global.warn('ProxyServer.onError. action:%s, error:%s', message.__action, error.message);
        }
    } catch (ex) {
        global.warn('ProxyServer.onError. error:%s, ex:%s', error.message, ex.message);
        global.warn(ex.stack);
    }
    cb(error);
};


// predefined policy: iAuth
Policy.prototype.iAuth = function(iList) {
	var self = this;

	iList.forEach(function(cmd) {
		self.parser[cmd] = function(client, protocol, cb) {

			async.waterfall([
				function(callback) { callback(); },
			], function(err){
				cb(err, {msg: 'test'});
			});

		};
	});
};

exports.createObject = function(external) {
    return new Policy(external);
};