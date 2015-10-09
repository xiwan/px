'use strict'

var fs = require('fs');
var async = require('async');
var util = require('util');
var __ = require('underscore');
var mConn = require('../../libs/base/mysqlConn');

// var monsters = [];
// var players = [];
var objects = {};
var monsterAttr = {
	speed : 0.05,
	range : 1,
	size : 0.5,
};

var apis = exports.apis = {};

apis.refreshObejct = function(protocol, cb){
	objects = protocol.data;
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
				var actions = [];
				if (data.monsters && data.players) {
					var lastPlayer = data.players[data.players.length-1];
					data.monsters.forEach(function(monster){
						monster.move.destinationX = lastPlayer.move.positionX;
						monster.move.destinationY = lastPlayer.move.positionY;
						monster.move.destinationZ = lastPlayer.move.positionZ;

						var disZ = monster.move.destinationZ - monster.move.positionZ;
						var disX = monster.move.destinationX - monster.move.positionX;
						// calculate the angle and speed on different dimension
						var radians = Math.atan(disZ/disX);
						var Vx = Math.abs(monsterAttr.speed * Math.cos(radians));
						var Vz = Math.abs(monsterAttr.speed * Math.sin(radians));
						// calculate the direction
						var factorX = (monster.move.destinationX > monster.move.positionX) ? 1 : -1;
						var factorZ = (monster.move.destinationZ > monster.move.positionZ) ? 1 : -1;

						if (Math.pow(disZ, 2) + Math.pow(disX, 2) < Math.pow(monsterAttr.range, 2)){
							factorX = 0;
							factorZ = 0;
							actions.push({
								CharGid : monster.move.CharGid,
								CriticalDmg : 100,
								atk : 10,
								miss : false,
							});
						}
						
						monster.move.positionX = monster.move.positionX + Vx * factorX;
						monster.move.positionY = monster.move.positionY;
						monster.move.positionZ = monster.move.positionZ + Vz * factorZ;						
					});
				}

				callback(null, {move: data, action: actions});
			}else {
				callback(null, null);
			}
		}
	], function(err, data){
		if (!err && data) {
			var services = global.base.getServiceList('SS');
			services.forEach(function(service){
				service.requestAction('notifyUsers', {data: data.move, name: 'move'}, function(){});
				if (data.action && data.action.length) {
					service.requestAction('notifyUsers', {data: data.action, name: 'action'}, function(){});
				}
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

apis.getServices = function() {
	var self = this;
	var redis = global.base.redis.system.get(global.const.CHANNEL_USAGE);
	if (!redis) return;
	var logQry = mConn.createObject(global.base.cfg.mysql, 'systemDB');
	if (!logQry) return;
    logQry.use('master');
	var list = [];
	console.log("apis getServices");
	redis.get(global.const.SERVICE_LIST_KEY, 60*1000, function(err, data) {
		if (err) return;
		var iQryList = [];
		iQryList.push('DELETE FROM `T_MON_SERVICE`');
        for (var key in data) {
            var log = data[key];
            iQryList.push({
            	sql : 'INSERT INTO T_MON_SERVICE SET ?',
	            data : {
	                idx : log.idx,
	                service : log.service,
	                hosts : log.hosts,
	                pid : log.pid,
	                state : log.state,
	                cpu : log.cpu,
	                memory : log.memory,
	                rss : log.rss,
	                startDate : log.startDate,
	                updateDate : log.updateDate
	            }
	        });
        }

        // console.log(iQryList);
        logQry.executeTrans(iQryList,function(err, results){
            if (err) {
                console.log("err:"+JSON.stringify(err));
                return;
            }
        });
	});
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
