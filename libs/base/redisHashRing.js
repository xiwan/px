'use strict';

var redis = require('redis');
var async = require('async');
var HashRing = require('hashring');
var util = require('util');

/**
* redis client with constant hashing alg
* so particular user will constantly use one redis
* @class RedisHashRing
* @constructor
*/
var RedisHashRing = exports.RedisHashRing = function(nodes, name) {
    var self = this;
    self.ring = new HashRing();
    self.nodes = nodes;
    self.name = name;
    self.server = {};
};

RedisHashRing.prototype.init = function(cb) {
	var self = this;
	async.each(self.nodes, function(node, callback) { self.add(node, callback) }, cb);
};

/**
* @method add: add a node to hashring
* @param node
* @param cb
*/
RedisHashRing.prototype.add = function(node, cb) {
	var self = this;
	try {
		var addr = node.split(':');
		var client = new redis.createClient(parseInt(addr[1]), addr[0]);
        self.server[node] = client;
        
		client.hosts = node;
		self.overloading(client);

		client.on('error', function(err){
			self.remove(node, err);
			cb && cb(null);
		});

		client.on('end', function(){
			self.remove(node , new Error('__redis_disconnected'));
			cb && cb(null);
		});

		client.on('ready', function(){
            var vnodes = {};
            vnodes[node] = { vnodes : 50 };
			self.ring.add(node);
			global.debug('RedisHashRing.add. name:%s, node:%s', self.name, node);
			cb && cb(null);
		});

        client.on('subscribe', function(channel, count) {
            var _client = new redis.createClient(parseInt(addr[1]), addr[0]);
            client._client = _client;
        });

	}catch(ex) {
		global.warn('RedisHashRing.add. name:%s, ex:%s', self.name, ex.message);
		global.warn(ex.stack);
		cb && cb(ex);
	}

};


/**
* @method remove: remove a node from hashring
* @param node
* @param error
*/
RedisHashRing.prototype.remove = function(node, error) {
	var self = this;
	try {
		var client = self.server[node];
		if (client) {
            client.removeAllListeners();
            client.end();
            delete self.server[node];
            client = null;			
		}
		self.ring.remove(node);
		if (error) { //if error, add node back to ring in 5s
			global.warn(error.stack);
			global.warn('RedisHashRing.remove. name:%s, node:%s, error:%s', self.name, node, error.message);
	        setTimeout(function() {
                self.add(node);
            }, 5000);
		}

	}catch(ex) {
        global.warn('RedisHashRing.remove. name:%s, ex:%s', self.name, ex.message);
        global.warn(ex.stack);		
	}
};

/**
* @method get: get a node by key
* @param key
*/
RedisHashRing.prototype.get = function(key) {
	var self = this;

	var node = self.ring.get(key);
	if (!node) throw new Error(util.format('__no_available_redis(%s)', key));
	return self.getByNode(node);
}

/**
* @method getByNode: get a node by node
* @param node
*/
RedisHashRing.prototype.getByNode = function(node) {
	var self = this;
	var client = self.server[node];
    if (!client) {
        self.remove(node);
        global.warn('RedisHashRing.get. name:%s, node:%s, ex:not_match_client', self.name, node);
        throw new Error(util.format('__no_available_redis(%s)', node));
    }
    return client;
}

/**
* 
*/
RedisHashRing.prototype.overloading = function(client) {
    /** get overloading : ttl 
     *  @param key
     *  @param if ttl > 0, the key will be expired
     *  @param cb
     **/
    global.utils.addMethod(client, 'get', function(key, ttl, cb) {
        client.get(key, function(err, data) {
            try {
                if (err) throw err;
                if (!data) throw new Error('__not_existed_key');

                if (ttl > 0) {
                    client.expire(key, ttl, function(err) {
                        err && global.warn('RedisHashRing.get.expire key:%s, error:%s', key, err);
                        cb(null, JSON.parse(data));
                    });
                } else {
                    cb(null, JSON.parse(data));
                }
            } catch (ex) {
                cb(ex);
            }
        });
    });
    /** set overloading : ttl 
     *  @param key
     *  @param if ttl > 0, the key will be expired
     *  @param cb
     **/
    global.utils.addMethod(client, 'set', function(key, data, ttl, cb) {
        client.set(key, JSON.stringify(data), function(err) {
            try {
                if (err) throw err;

                if (ttl > 0) {
                    client.expire(key, ttl, function(err) {
                        err && global.warn('RedisHashRing.get.expire. key:%s, error:%s', key, err);
                        cb(null);
                    });
                } else {
                    cb(null);
                }
            } catch (ex) {
                cb(ex);
            }
        });
    });

    /** hget overloading : combined hvals and hkeys results
     *  @param key
     *  @param cb
     **/
    global.utils.addMethod(client, 'hget', function(key, cb) {
        var cmds = [ ['hvals', key], ['hkeys', key] ];
        client.multi(cmds).exec(function(err, results) {
            cmds = null;
            try {
                if (err) throw err;
                cb(null, results[0], results[1]);
            } catch (ex) {
                global.warn('redis.hget. key:%s', key);
                cb(ex);
            }
        });
    });

    /** */
    client.push = function(key, data, cb) {
        var self = this;
        self.rpush(key, JSON.stringify(data), function(err) { cb(err); });
    };

    /** */
    client.pop = function(key, timeout, cb) {
        var self = this;
        self.blpop(key, timeout, function(err, item) {
            try {
                if (err) throw err;
                if (!item) throw new Error('__empty_queue');

                var iData = JSON.parse(item[1]);
                cb(null, iData);
            } catch (ex) {
                cb(ex);
            }
        });
    };

};

exports.createObject = function(nodes, name) {
    return new RedisHashRing(nodes, name);
};


