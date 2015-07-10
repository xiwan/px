'use strict'

var async = require('async');
var iSession = require('./session');
var util = require('util');
var events = require('events');
var __ = require('underscore');

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

Policy.prototype.load = function(owner, commands) {
    var self = this;
    var keys = Object.keys(commands);
    self.owner = owner;

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
        }, 1000 * 10);

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

Policy.prototype.requestAction = function(action, protocol, cb){
    var self = this;
    try {
        var owner = self.owner;
        protocol.__action = action;
        var begin = new Date();
        if ('function' !== typeof(owner[action])) {
            throw new Error('__unregistered_api');
        }
        owner[action].call(owner, protocol, function(err, iAck){
            if (err) throw err;
            cb(null, iAck);
        });
    }catch (ex) {
        global.error('Constructor.requestAction. action:%s, ex:%s', action, ex.toString());
        global.warn(ex.stack);
        cb(ex);        
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


// predefined policy: iNone
Policy.prototype.iNone = function(iList) {
	var self = this;

	iList.forEach(function(cmd) {
		self.parser[cmd] = function(client, protocol, cb) {

			async.waterfall([
				function(callback) { callback(); },
			], function(err){
				cb(err, {msg: 'iNone'});
			});

		};
	});
};

// predefined policy: iAuth
Policy.prototype.iAuth = function(iList) {
    var self = this;

    iList.forEach(function(cmd) {
        self.parser[cmd] = function(client, protocol, cb) {
            async.waterfall([
                function(callback) { 
                    self.session.get(protocol.appSessionKey, cb); 
                },
                function(session, callback) { 
                    if (!session.uid) {
                        return callback(new Error('__invalid_session'));
                    }
                    if (!self.owner[cmd]){
                        return callback(new Error('__api_unregistered'));
                    }
                    protocol.__session = session;
                    protocol.__action = cmd; 
                    self.owner[cmd].call(self, protocol, callback);
                },
            ], function(err, iAck){
                err && global.base.sendErrorHistory(err, protocol, cmd);
                cb(err, iAck);
            });

        };
    });
};

// predefined policy: iPass
Policy.prototype.iPass = function(iList) {
    var self = this;
    iList.forEach(function(cmd) {
        self.parser[cmd] = function(client, protocol, cb) {
            var idx = __.random(0, 100).toString(); // because no session availble, random policy is ok
            async.waterfall([ 
                function(callback) {  global.base.getService(idx, true, 'UD', callback); },
                function(service, callback) { service.requestAction(cmd, protocol, cb); },
            ], cb);

        };
    });
};

// predefined policy: iUser
Policy.prototype.iUser = function(iList) {
    var self = this;

    iList.forEach(function(cmd) {
        self.parser[cmd] = function(client, protocol, cb) {

            async.waterfall([
                function(callback) { callback(); },
            ], function(err){
                cb(err, {msg: 'iUser'});
            });

        };
    });
};

exports.createObject = function(external) {
    return new Policy(external);
};