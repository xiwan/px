'use strict';

var async = require('async');
var util = require('util');

var apis = exports.apis = {};

apis.testABC = function(protocol, cb) {
	var self = this;
	self.gameSystem.testABC(function(err, results){
		cb(err, {msg: results})		
	});

};

apis.test1 = function(protocol, cb) {
	var self = this;
	self.gameSystem.test1(function(err, results){
		cb(err, {msg: results})		
	});	
};

apis.StartScence = function(protocol, cb) {
	var self = this;
	try {
		var redis = global.base.redis.boss.get(protocol.sid);
		if (!redis) throw new Error('out-of-service');

		async.waterfall([
			function(callback) {
				redis.get(protocol.sid, 60*1000, function(err, data){
					if (err && err.message === '__not_existed_key') {
						callback(null, null);
					}else {
						callback(err, data);
					}
				});
			},
			function(data, callback) {
				if (data) {
					callback(null, data);
				}else {
					var move = {
						CharGid : 0,
						destinationX : 0,
						destinationY : 0,
						destinationZ : 0,
						positionX : 0,
						positionY : 0,
						positionZ : 0,
						rotationX : 0,
						rotationY : 0,
						rotationZ : 0,
					}
					var monsters = [];
					var monster = {
						id : 20121,
						pos : 1,
						gid : 60,
						gold : 4,
						exp : 2,
						move : move,
					};
					monster.move.positionX = 10,
					monsters.push(monster);

					monster = {
						id : 20122,
						pos : 2,
						gid : 61,
						gold : 4,
						exp : 2,
						move : move,
					};
					monster.move.positionX = 20,
					monsters.push(monster);

					redis.set(protocol.sid, monsters, 60*1000, function(err){
						cb(err, monsters);
					});
				}
			},

		], function(err, results) {
			if (err) {
				return cb(err);
			}
			cb(err, results);
		});

	}catch (ex) {
		cb(ex);
	}
};