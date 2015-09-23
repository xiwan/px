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
	this.items = [{
		name : 'Behavior',
		crc : 11998743091
	}];
}

var payload = new User();

async.waterfall([
	// function (callback) {
	// 	apis.httpRequest('EFGetVersionListReq', payload, function(err, iAck){
	// 		callback(err, iAck);
	// 	});		
	// },
	function (callback) {
		apis.httpRequest('EFCheckTableCrcReq', payload, function(err, iAck){
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



