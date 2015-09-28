'use strict';

var fs = require('fs');
var async = require('async');
var util = require('util');
var __ = require('underscore');

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
};

apis.StartScene = function(protocol, cb) {
	var self = this;
	try {
		var redis = global.base.redis.boss.get(protocol.sid);
		if (!redis) throw new Error('out-of-service');

		async.waterfall([
			function(callback) {
				redis.get('scene' + protocol.sid, 60*1000, function(err, data){
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

					var monsters = [];
					var monster = {
						id : 20121,
						pos : 1,
						gid : 60,
						gold : 4,
						exp : 2,
						move : global.utils.clone(move),
					};
					monster.move.positionX = 10,
					monster.move.positionZ = 10,
					monster.move.CharGid = monster.gid;
					monsters.push(monster);
					monster = null;

					monster = {
						id : 20122,
						pos : 2,
						gid : 61,
						gold : 4,
						exp : 2,
						move : global.utils.clone(move),
					};
					monster.move.positionX = 20,
					monster.move.positionZ = 10,
					monster.move.CharGid = monster.gid;
					monsters.push(monster);

					var storeData = {players: [], monsters: monsters};
					redis.set('scene' + protocol.sid, storeData, 60*1000, function(err){
						callback(err, storeData);
					});
				}
			},
			function(storeData, callback) {
				var uid = protocol.__session.uid; 
				var player = {
					uid : uid,
					health : 1000,
					move : global.utils.clone(move)
				};
				player.move.CharGid = protocol.CharGid || 0;
				player.move.positionX = 10 + __.random(0,5);
				player.move.positionY = 0;
				player.move.positionZ = 20;
				storeData.players.length = 0;
				storeData.players.push(player);
				
				redis.set('scene' + protocol.sid, storeData, 60*1000, function(err){
					callback(err, storeData.monsters);
				});
			}

		], function(err, results) {
			if (err) {
				return cb(err);
			}
			cb(err, {result: 'success', monsters: results});
		});

	}catch (ex) {
		cb(ex);
	}
};


function apiDetector() {
    fs.readdir(__dirname, function(err, files) {
        if (err) return;
        files.forEach(function(f) {
            if (f != 'main.js'){
                var __apis = require('./' + f.replace('.js', '')).apis;
                for (var key in __apis) {
                    var handler = __apis[key];
                    if (!apis[key]) {
                        apis[key] = handler;
                    }else {
                        global.warn('there is duplicate handlers in apis: %s, please rename it', key);
                    }
                }
            }
        });
    });   
}
apiDetector();
