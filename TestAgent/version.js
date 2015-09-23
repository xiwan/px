/**
* @class TestAgent
*/

var util = require('util');
var __ = require('underscore');
var async = require('async');
var WebSocket = require('ws');

var apis = require('./apis/main').apis;

var User = function(){
	this.dataVersion = 1;
}

var bot = new User();

async.waterfall([
	function (callback) {
		apis.httpRequest('EFGetVersionListReq', bot, function(err, iAck){
			callback(err, iAck);
		});		
	},
], function(err, results){
	if (err) {
		console.log(err.stack);
		return;
	}
	console.log(results);
});



