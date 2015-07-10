'use strict'

var util = require('util');
var async = require('async');
var __ = require('underscore');


var ChannelAgent = function() {
	var self = this;

	self.channels = {};
	self.channelUsage = [];

};

ChannelAgent.prototype.prepare = function(){
	var self = this;
	setTimeout(function(){
		self.checkChannelUsage();
		self.prepare();
	}, 1000 * 5);
}


ChannelAgent.prototype.checkChannelUsage = function(){
	var self = this;
	try {
		var channels = {};
		var key = global.const.KEY_CHANNEL_USAGE;
		var keys = Object.keys(global.base.users);
		var redis = global.base.redis.channel.get(key);

		keys.forEach(function(key){
			var client = global.base.users[key];
			if (client.__timeId || !client.__channel) return;

			var idxList = Object.keys(client.__channel);
			idxList.forEach(function(idx){
				var key = client.__channel[idx].split('.');
                if (key[1] !== 'pub')
                    return;
                var value = key[2];	
                var usage = channels[value] || (channels[value] = {key : value, count : 0, date : new Date()});
                usage.count++;			
			});

		});

		async.waterfall([
			function(callback) {
				redis.hset(key, global.base.idx, JSON.stringify(channels), callback);
			},
			function(ok, callback) {
				redis.hget(key, callback);
			},
			function(dataList, keys, callback) {
				self.updateChannelUsage(dataList, keys, callback);
			}
		], function(err){
            if (err) {
                global.warn('ChannelAgent.checkChannelUsage. err:%s', err.message);
                global.warn(err.stack);
            }
		});

	}catch(ex) {
        global.warn('ChannelAgent.checkChannelUsage. ex:%s', ex.message);
        global.warn(ex.stack);
	}
};

ChannelAgent.prototype.updateChannelUsage = function(dataList, keys, cb) {
	var self = this;
	try {
		var channels = {};
		var now = new Date();

		keys.forEach(function(key, pos){
			var iList = JSON.parse(dataList[pos]);
			var keys = Object.keys(iList);
			if (keys.length < 1) return;

			keys.forEach(function(key){
                var data = iList[key];
                if (now - new Date(data.date) > 1000 * 20)
                    return;	
                var usage = channels[data.key] || (channels[data.key] = { key : parseInt(key), count : 0 });
                usage.count += data.count;			
			});
		});

		self.channelUsage = [];
		Object.keys(channels).forEach(function(key) { 
			self.channelUsage.push(channels[key]); 
		});
		self.channelUsage.sort(function(x, y) { return y.count - x.count; });
		// console.dir(self.channelUsage);
		cb(null);
	}catch (ex) {
		cb(ex);
	}
};


exports.createObject = function(users) {
    return new ChannelAgent(users);
};
