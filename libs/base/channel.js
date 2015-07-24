'use strict'

var util = require('util');
var async = require('async');
var __ = require('underscore');


var ChannelAgent = function(policy) {
	var self = this;

	self.policy = policy;
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
		var key = global.const.CHANNEL_USAGE;
		var keys = Object.keys(global.base.users);
		var redis = global.base.redis.channel.get(key);

		keys.forEach(function(key){
			var socket = global.base.users[key];
			if (socket.__timeId || !socket.__channel) return;

			var idxList = Object.keys(socket.__channel);
			idxList.forEach(function(idx){
				var key = socket.__channel[idx].split('.');
                if (key[1] !== global.const.CHANNEL_PUB)
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

/**
* @mehtod getChannelIdx: return the first availble channel idx
*/
ChannelAgent.prototype.getChannelIdx = function(){
	var iLen = self.channelUsage.length;
	var stdValue = parseInt(global.const.CHANNEL_MAX_JOIN_NUM * 0.7);
	var idx = 1;
	for (i = 0; i<iLen; i++) {
		var usage = self.channelUsage[i];
        if (usage.key !== idx)
            break;
        if (usage.count < stdValue) {
            usage.count++;
            break;
        }
        idx++;
	}
	return idx;
}

ChannelAgent.prototype.joinChannel = function(socket, channelType, idx) {
	var self = this;
	try {
		if (__.indexOf([global.const.CHANNEL_PUB_IDX, global.const.CHANNEL_CLAN_IDX], channelType) < 0) 
			 throw new Error('__invalid_param');
        if (idx != parseInt(idx))
            throw new Error('__invalid_param');
        var name = (channelType === global.const.CHANNEL_PUB_IDX) ? global.const.CHANNEL_PUB : global.const.CHANNEL_CLAN;
        var key = util.format('channel.%s.%s', name, idx);
        var usage = self.channels[key];
        if (usage && global.const.CHANNEL_MAX_JOIN_NUM <= usage.count)
            throw new Error('__channel_exceeded');

        if (channelType === global.const.CHANNEL_PUB_IDX) {

        }

        var iAck = {
            result : 'success',
            channelType : channelType,
            idx : idx
        };
        	console.log(key, socket.__channel)
        //if (socket.__detail) {
            socket.__channel[channelType] = key;
            self.subscribe(socket, key);
        //}
	}catch (ex) {
		console.log(ex.stack);
	}
};

ChannelAgent.prototype.subscribe = function(socket, key){
	var self = this;
	var usage = self.channelUsage[key] || (self.channels[key] = { date : new Date(), count : 0, hosts : '', joins : {}});
	var redis = global.base.redis.channel.get(key);

	if (usage.hosts != redis.hosts) {
		usage.hosts = redis.hosts;
		redis.__channel || (redis.__channel = {});
		if (!redis.__channel[key]) {
			redis.__channel[key] = true;
			redis.subscribe(key);
			global.debug('ChannelAgent.subscribe. key:%s, hosts:%s', key, redis.hosts);
            redis.on('message', function(key, message) {
                self.policy && self.policy.emit('subscribe', key, message);            	
            });
		}
	}

    usage.count++;
    usage.joins[socket.__id] = socket;
};

ChannelAgent.prototype.sendChannelMsg = function(socket, channelType, msg, cb){
	var self = this;
	try {
		var key = socket.__channel[channelType];
		if (!socket.__detail) throw new Error('__session_state');
		if (!key) throw new Error('__channel_not_joined');

		var usage = self.channels[key];
		if (!usage) throw new Error('__system_error');

		var message = {
			name : 'recvChannelMsg',
			body : {
				channelType : channelType,
				msg : msg,
				sendTime : new Date(),
			}
		};

		redis = global.base.redis.channel.getByNode(usage.hosts);
		redis.publish(key, JSON.stringify(message));
		cb(null);
	}catch (ex) {
		global.warn('ChannelAgent.sendChannelMsg. error:%s', ex.message);
		cb(ex)
	}
};

ChannelAgent.prototype.recvChannelMsg = function(key, iMsg) {
	var self = this;
	try {
		var usage = self.channels[key];
		var info = key.split('.');
		var now = new Date();

		if (!usage) throw new Error('__system_error');
        iMsg.result = 'success';
        iMsg.channelId = info[2];

        Object.keys(usage.joins).forEach(function(key) {
        	var socket = usage.joins[key];
            if (!socket.__channel)
                return;
            socket.emit('redirect', 'EFRecvChannelMsg', iMsg); // client side need to define 'EFRecvChannelMsg' function
        });

	}catch (ex) {
		global.warn('ChannelAgent.recvChannelMsg. error:%s', ex.message);
	}
};

/**
* @method: send message to multi clients
*/
ChannelAgent.prototype.sendToMultiClient = function(message, cb){
	message.uidList.forEach(function(uid){
        var socket = global.base.users[uid];
        if (!socket) return;
        socket.emit('redirect', message.name, message.body);
	});
	cb(null, {result : 'success'});
};

exports.createObject = function(users) {
    return new ChannelAgent(users);
};
