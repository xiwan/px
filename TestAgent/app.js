/**
* @class TestAgent
*/

var util = require('util');
var __ = require('underscore');
var async = require('async');
var WebSocket = require('ws');

var apis = require('./apis/main').apis;

var User = function(){
	this.appSessionKey = '',
	this.uid = 0, 
	this.deviceId = 'foo',
	this.clientVersion = 101,
	this.market = 1
}

var bot = new User();

async.waterfall([
	function (callback) {
		apis.httpRequest('ClientLogin', bot, function(err, iAck){
			bot.appSessionKey = iAck.appSessionKey;
			callback();
		});		
	},
	function (callback) {
		apis.wsRequest('UserSocketLogin', bot, function(err, iAck){
			callback();
		});
	},
	function (callback) {
		bot.channelType = 1;
		bot.idx = 1;
		apis.wsRequest('JoinChannel', bot, function(err, iAck){
			callback();
		});
	},
	function (callback) {
		bot.msg = ' bot msg ' + __.random(1, 100);
		apis.wsRequest('SendChattingMsg', bot, function(err, iAck){
			callback();
		});
	},
	function (callback) {
		bot.sid = 1;
		apis.httpRequest('StartScence', bot, function(err, iAck){
			console.log(iAck)
			callback();
		});	
	},
], function(err, results){
	if (err) {
		console.log(err.stack);
		return;
	}
	console.log('done!!');
});



