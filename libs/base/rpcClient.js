'use strict';

var HashRing = require('hashring');
var util = require('util');
var dnode = require('dnode');
var net = require('net');
var fs = require('fs');

var ClientHashRing = exports.ClientHashRing = function(remote, options) {
    var self = this;
    self.ring = new HashRing();
    self.redis = options.redis;
    self.server = {};
    self.remote = remote;
    self.name = options.alias;

    setInterval(function() { self.check(); }, 500);
};

ClientHashRing.prototype.check = function() {
    var self = this;
    try {
        var client = self.redis.get(self.remote);
        if (!client) throw new Error('out-of-service');
        client.hget(self.remote, function(err, vals, keys) {
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
                global.warn('ClientHashRing.check.hkeys name:%s, ex:%s', self.remote, ex.message);
            }
        });
    } catch (ex) {
        global.warn('ClientHashRing.check. name:%s, err:%s', self.remote, ex.message);
    }
};

ClientHashRing.prototype.add = function(server) {
    var self = this;
    try {
        /** check existence.. */
        if (self.server[server.key])
            return;

        var addr, rpc, now, lastUpdateDate, alias;

        now = new Date();
        lastUpdateDate = new Date(server.data.lastUpdateDate);
        alias = server.data.alias;
        // too long and consider as drop
        if (now - lastUpdateDate > 10000)
            return;

        addr = server.key.split(':');
        rpc = self.server[server.key] = {
            key : server.key,
            node : dnode(),
            remote : null,
            socket : null
        };

        rpc.node.on('end', function()  { self.remove(rpc.key, alias, 1, new Error('__remote_down')); });
        rpc.node.on('fail', function(err) { self.remove(rpc.key, alias, 2, err); });
        rpc.node.on('error', function(err) { self.remove(rpc.key, alias, 3, err); });
        rpc.node.on('remote', function (remote) {
            rpc.remote = remote;
            rpc.remote.__key = rpc.key;
            var vnode = {};
            vnode[rpc.key] = { vnodes : 50 };
            self.ring.add(vnode);
            
            process.nextTick(function(){
              self.buildConnMap(alias);
            });

            global.debug('ClientHashRing.add. name:%s, node:%s', self.remote, server.key);
        });

        rpc.socket = net.connect(addr[1], addr[0]);
        rpc.socket.on('error', function(err) { self.remove(rpc.key, alias, 4, err); });
        rpc.socket.pipe(rpc.node).pipe(rpc.socket);
    } catch (ex) {
        global.warn(ex.stack);
        global.warn('ClientHashRing.add. key:%s, ex:%s', server.key, ex.message);
    }
};

ClientHashRing.prototype.remove = function(key, alias, flag, error) {
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

        // process.nextTick(function(){
        //     try {
        //         var iMap = './' + global.const.SERVICE_MAP_FILE;
        //         if (fs.existsSync(iMap) && fs.statSync(iMap).isFile()) {
        //             var contents = fs.readFileSync(iMap).toString();
        //             var oMsg = self.name + ' -> ' + alias ;
        //             var nMsg = self.name + ' x ' + alias;
        //             if (contents.match(oMsg)) {
        //                 contents = contents.replace(oMsg, nMsg);
        //                 fs.writeFileSync(iMap, contents);                        
        //             }
        //         } 
        //     }catch (ex) {
        //         console.log(ex.stack);
        //     }              
        // });

        // global.warn('ClientHashRing.remove. key:%s, flag:%s, err:%s', key, flag, error.message);
    } catch (ex) {
        global.warn('ClientHashRing.remove. key:%s, flag:%s, ex:%s', key, flag, ex.message);
    }
};

ClientHashRing.prototype.get = function(hash) {
    var self = this;
    var key = self.ring.get(hash);
    if (!key) throw new Error('__no_server');
    return self.getByKey(key);
};

ClientHashRing.prototype.getByKey = function(key) {
    var self = this;
    var rpc = self.server[key];
    if (!rpc || !rpc.remote) {
        self.remove(key, new Error('__no_server'));
        return null;
    }

    return rpc;
};


ClientHashRing.prototype.buildConnMap = function(alias) {
    var self = this;
    try {
        var iMap = './' + global.const.SERVICE_MAP_FILE;
        if (fs.existsSync(iMap) && fs.statSync(iMap).isFile()) {
            var oMsg = self.name + ' x ' + alias ;
            var nMsg = self.name + ' -> ' + alias;
            var contents = fs.readFileSync(iMap).toString();
            if (contents.match(oMsg)) {
                contents = contents.replace(oMsg, nMsg);
                fs.writeFileSync(iMap, contents);                        
            }else {
                var iMsg = global.utils.toDateTime(new Date()) + '\t' +  self.name + ' -> ' + alias + '\n';
                fs.appendFileSync(iMap, iMsg);                            
            }
        } 
    }catch (ex) {
        console.log(ex.stack);
    } 
};


exports.createObject = function(remote, options) {
    return new ClientHashRing(remote, options);
};