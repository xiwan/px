'use strict'

var async = require('async');
var util = require('util');
var __ = require('underscore');

// var monsters = [];
// var players = [];
var objects = {};
var monsterAttr = {
	speed : 0.1,
	range : 1,
};

var apis = exports.apis = {};

apis.refreshObejct = function(protocol, cb){
	objects = protocol.data;
	console.log('xxxxxx', JSON.stringify(objects));
	cb(null, objects);
};

apis.simScene = function(){
	var key = 1;
	var redis = global.base.redis.boss.get(key);
	if(!redis) {}

	async.waterfall([
		function(callback) {
			if (__.size(objects) > 0 ) {
				callback(null, objects);
			}else {
				redis.get('scene' + key, 60*1000, function(err, data) {
					if (err && err.message === '__not_existed_key') {
						callback(null, null);
					}else {
						// monsters = data.monsters;
						// players = data.players;
						objects = data;
						callback(err, objects);
					}
				});
			}
		},
		function(data, callback) {
			
			if (data) {
				if (data.monsters && data.players) {
					var lastPlayer = data.players[data.players.length-1];
					data.monsters.forEach(function(monster){
						monster.move.destinationX = lastPlayer.move.positionX;
						monster.move.destinationY = lastPlayer.move.positionY;
						monster.move.destinationZ = lastPlayer.move.positionZ;

						var radians = Math.atan((monster.move.destinationZ-monster.move.positionZ)/(monster.move.destinationX-monster.move.positionX));
						var Vx = monsterAttr.speed * Math.cos(radians);
						var Vz = monsterAttr.speed * Math.sin(radians);

						var factor1 = (monster.move.destinationX > monster.move.positionX) ? 1 : -1;
						var factor2 = (monster.move.destinationZ > monster.move.positionZ) ? 1 : -1;

						if (monster.move.destinationX + monsterAttr.range > monster.move.positionX ||
							monster.move.destinationX - monsterAttr.range < monster.move.positionX)
							factor1 = 0;
						if (monster.move.destinationZ + monsterAttr.range > monster.move.positionZ ||
							monster.move.destinationZ - monsterAttr.range < monster.move.positionZ)
							factor2 = 0;

						monster.move.positionX = monster.move.positionX + Vx * factor1;
						monster.move.positionY = monster.move.positionY;
						monster.move.positionZ = monster.move.positionZ + Vz * factor2;						
					});
				}

				callback(null, data);
			}else {
				callback(null, null);
			}
		}
	], function(err, data){
		if (!err && data) {
			var services = global.base.getServiceList('SS');
			services.forEach(function(service){
				service.requestAction('notifyUsers', {data: data, name: 'move'}, function(){});
			});
		}
	});
};

apis.simPlayers = function(protocol, cb) {
	var self = this; 
	try {
		var msg = JSON.parse(protocol.msg);
		// update current player postion
		objects.players && objects.players.forEach(function(player) {
			console.log(msg.SyncName, player.move.CharGid, msg.CharGid);
			if (msg.SyncName == "Move" && player.move.CharGid == msg.CharGid) {
				player.move.positionX = msg.positionX;
				player.move.positionY = msg.positionY;
				player.move.positionZ = msg.positionZ;
				player.move.rotationX = msg.rotationX;
				player.move.rotationY = msg.rotationY;
				player.move.rotationZ = msg.rotationZ;
			}
		});
		
	}catch (ex) {
		cb(ex);
	}
};

// public class MoveSync : GameSync {
// 	public string CharGid;
// 	public float destinationX;
// 	public float destinationY;
// 	public float destinationZ;
// 	public float positionX;
// 	public float positionY;
// 	public float positionZ;
// 	public float rotationX;
// 	public float rotationY;
// 	public float rotationZ;
// 	public MoveSync() {
// 		SyncName = "Move";
// 	}
// }

// {"result":"success","linkNo":0,"links":[{"idx":12,"rewardIds":[],"bossReward":0,"key":1,"monsters":[{"id":20122,"pos":1,"gid":60,"gold":4,"exp":2},{"id":20122,"pos":2,"gid":61,"gold":4,"exp":2},{"id":20101,"pos":4,"gid":63,"gold":2,"exp":1},{"id":20101,"pos":5,"gid":64,"gold":2,"exp":1}]},{"idx":37,"rewardIds":[],"bossReward":0,"key":2,"monsters":[{"id":20103,"pos":1,"gid":160,"gold":7,"exp":2},{"id":20122,"pos":3,"gid":162,"gold":4,"exp":2}]},{"idx":51,"rewardIds":[],"bossReward":0,"key":3,"monsters":[{"id":20103,"pos":1,"gid":260,"gold":7,"exp":2},{"id":20115,"pos":4,"gid":263,"gold":4,"exp":1},{"id":20115,"pos":5,"gid":264,"gold":4,"exp":1},{"id":20115,"pos":8,"gid":267,"gold":4,"exp":1}]},{"idx":67,"rewardIds":[],"bossReward":0,"key":4,"monsters":[{"id":20101,"pos":1,"gid":360,"gold":2,"exp":1},{"id":20101,"pos":3,"gid":362,"gold":2,"exp":1},{"id":20101,"pos":4,"gid":363,"gold":2,"exp":1}]},{"idx":78,"rewardIds":[],"bossReward":0,"key":5,"monsters":[{"id":20103,"pos":1,"gid":460,"gold":7,"exp":2},{"id":20101,"pos":4,"gid":463,"gold":2,"exp":1},{"id":20101,"pos":5,"gid":464,"gold":2,"exp":1},{"id":20117,"pos":8,"gid":467,"gold":4,"exp":1}],"goblin":{"id":400001,"level":1,"hits":30,"goldDrop":30,"goldTotal":900,"ggid":39}}]}