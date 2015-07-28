/**
* @class TestAgent
*/

var util = require('util');
var __ = require('underscore');
var async = require('async');
var WebSocket = require('ws');

var apis = require('./apis/main').apis;

//var ws = new WebSocket('ws://localhost:1437/');

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
		apis.httpRequest('EFClientLogin', bot, function(err, iAck){
			bot.appSessionKey = iAck.appSessionKey;
			callback();
		});		
	},
	function (callback) {
		apis.wsRequest('EFUserSocketLogin', bot, function(err, iAck){
			callback();
		});
	},
	function (callback) {
		bot.channelType = 3;
		bot.idx = 3;
		apis.wsRequest('EFJoinChannel', bot, function(err, iAck){
			callback();
		});
	},
	function (callback) {
		bot.msg = ' bot msg ' + __.random(1, 100);
		apis.wsRequest('EFSendChattingMsg', bot, function(err, iAck){
			callback();
		});
	}
], function(err, results){
	if (err) {
		console.log(err.stack);
		return;
	}
	console.log('done!!');
});



