'use strict';

var HashRing = require('hashring');
var util = require('util');
var dnode = require('dnode');
var net = require('net');

var ClientHashRing = exports.ClientHashRing = function(name, options) {
    var self = this;
    self.ring = new HashRing();
    self.redis = options.redis;
    self.server = {};
    self.name = name;

    setInterval(function() { self.check(); }, 100);
};

ClientHashRing.prototype.check = function() {
    var self = this;
    try {
        var client = self.redis.get(self.name);
        client.hget(self.name, function(err, vals, keys) {
            try {
                if (err) throw err;
                keys.forEach(function(key, pos) {
                    var server = {
                        key : key,
                        data : JSON.parse(vals[pos])
                    };

                    self.add(server);
                });
            } catch (ex) {
                global.warn('ClientHashRing.check.hkeys name:%s, ex:%s', self.name, ex.message);
            }
        });
    } catch (ex) {
        global.warn('ClientHashRing.check. name:%s, err:%s', self.name, ex.message);
    }
};

ClientHashRing.prototype.add = function(server) {
    var self = this;
    try {
        /** check existence.. */
        if (self.server[server.key])
            return;

        var addr, rpc, now, lastUpdateDate;

        now = new Date();
        lastUpdateDate = new Date(server.data.lastUpdateDate);
        if (now - lastUpdateDate > 10000)
            return;

        addr = server.key.split(':');
        rpc = self.server[server.key] = {
            key : server.key,
            node : dnode(),
            remote : null,
            socket : null
        };

        rpc.node.on('end', function()  { self.remove(rpc.key, 1, new Error('__remote_down')); });
        rpc.node.on('fail', function(err) { self.remove(rpc.key, 2, err); });
        rpc.node.on('error', function(err) { self.remove(rpc.key, 3, err); });
        rpc.node.on('remote', function (remote) {
            rpc.remote = remote;
            rpc.remote.__key = rpc.key;
            var vnode = {};
            vnode[rpc.key] = { vnodes : 50 };
            self.ring.add(vnode);
            global.debug('ClientHashRing.add. name:%s, node:%s', self.name, rpc.key);
        });

        rpc.socket = net.connect(addr[1], addr[0]);
        rpc.socket.on('error', function(err) { self.remove(rpc.key, 4, err); });
        rpc.socket.pipe(rpc.node).pipe(rpc.socket);
    } catch (ex) {
        global.warn(ex.stack);
        global.warn('ClientHashRing.add. key:%s, ex:%s', server.key, ex.message);
    }
};

ClientHashRing.prototype.remove = function(key, flag, error) {
    try {
        var self = this,
            rpc;

        self.ring.remove(key);

        if (!self.server[key])
            return;

        rpc = self.server[key];
        rpc.node = null;
        rpc.remote = null;
        rpc.socket = null;

        self.server[key] = null;
        delete self.server[key];

        global.warn('ClientHashRing.remove. key:%s, flag:%s, err:%s', key, flag, error.message);
    } catch (ex) {
        global.warn('ClientHashRing.remove. key:%s, flag:%s, ex:%s', key, flag, ex.message);
    }
};

ClientHashRing.prototype.get = function(hash) {
    var self = this,
        rpc, key;

    key = self.ring.get(hash);
    if (!key) throw new Error('__no_server');

    rpc = self.server[key];
    if (!rpc || !rpc.remote) {
        self.remove(key, new Error('__no_server'));
        throw new Error('__no_server');
    }

    return rpc;
};

ClientHashRing.prototype.getByKey = function(key) {
    var self = this,
        rpc;

    rpc = self.server[key];
    if (!rpc || !rpc.remote) {
        self.remove(key, new Error('__no_server'));
        return null;
    }

    return rpc;
};

exports.createObject = function(name, options) {
    return new ClientHashRing(name, options);
};