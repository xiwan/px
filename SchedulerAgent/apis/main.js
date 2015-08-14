'use strict'

var async = require('async');
var util = require('util');

var monsters = [];

var apis = exports.apis = {};

apis.simMonster = function(){
	var key = 1;
	var redis = global.base.redis.boss.get(key);
	if(!redis) {}

	async.waterfall([
		function(callback) {
			if (monsters.length) {
				callback(null, monsters);
			}else {
				redis.get(key, 60*1000, function(err, data) {
					if (err && err.message === '__not_existed_key') {
						callback(null, null);
					}else {
						monsters = data;
						callback(err, monsters);
					}
				});
			}

		},
		function(monsters, callback) {
			if (monsters) {
				monsters.forEach(function(monster){
					monster.move.positionZ += 1;
				});
				callback(null, monsters);
			}else {
				callback(null, null);
			}
		}
	], function(err, data){
		if (!err) {
			var services = global.base.getServiceList('SS');
			services.forEach(function(service){
				service.requestAction('notifyUsers', {data: data, name: 'move'}, function(){});
			});
		}
	});
}

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