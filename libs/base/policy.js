'use strict'

var async = require('async');
var iSession = require('./session');
var util = require('util');
var events = require('events');

var Policy = function (external) {
	events.EventEmitter.call(this);
	this.parser = {};
	this.session = iSession.createObject();

};
util.inherits(Policy, events.EventEmitter);

Policy.prototype.iAuth = function(iList) {
	var self = this;

	iList.forEach(function(cmd) {
		self.parser[cmd] = function(client, protocol, cb) {

			async.waterfall([
				function(callback) { callback(); },
			], function(err){
				cb(err, {msg: 'test2'});
			});

		};
	});
};

exports.createObject = function(external) {
    return new Policy(external);
};