'use strict';

var util = require('util');
var __ = require('underscore');
var async = require('async');
var forever = require('forever-monitor');

var base = require('../libs/app_base');
var server = require('./cmdServer');
var mConn = require('../libs/base/mysqlConn');
var redis = require('redis');

// var helloAddon = require('../build/Release/hello');
// var addAddon = require('../build/Release/add');
// var callbackAddon = require('../build/Release/callback');
// var objFactoryAddon = require('../build/Release/objFactory');
// var funFactoryAddon = require('../build/Release/funFactory');

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);

    this.process = {};
    this.service = [];
    this.cmds = null;
    this.parser = null;
    this.deployDir = null;
    this.usage = null;
    this.mode = null;
    
    // callbackAddon(function(msg){
    //     console.log(msg);
    //     console.log(helloAddon.hello());
    // });
        
    // console.log(addAddon.add(3,5));

    // var obj1 = objFactoryAddon("Xi");
    // var obj2 = objFactoryAddon("Wan");
    // console.log(obj1.msg + " " + obj2.msg);

    // var fn = funFactoryAddon();
    // console.log(fn()); 
};
util.inherits(Constructor, base.Constructor);

Constructor.prototype.run = function(cb) {
	var self = this;

	self.usage = new base.Usage();
	self.addProcessData(self.name, self.idx, process.pid, self.startDate, 0);

    self.hostname = require('os').hostname();
    self.ipAddr = global.utils.getIPAddress();
    self.cmds = new server.CmdServer(self.name + '.' + self.idx, self.cfg.tcp.port, '0.0.0.0');
    self.cmds.run({});

    
	self.monitorChildProcess(cb);
    self.getServiceList();
    self.redisSys = global.base.redis.system.get(global.const.CHANNEL_USAGE);
    self.redisSys.emit('subscribe', 'AppCmds', {});
    self.redisSys._client.subscribe('AppCmds');
    self.redisSys._client.on('message', function(channel, message) {
        var iMsg = JSON.parse(message);
        console.log(JSON.stringify(iMsg));
        self.cmds.onMsg(null, iMsg.body);
    });
    cb(null);
};

/**
* @method addProcessData
* name : process name
* idx : process idx
* pid : process pid
* startTime : process start time
* bChild : child process flag 
*/
Constructor.prototype.addProcessData = function(name, idx, pid, startTime, bChild) {
    pid || (pid = 0);
    startTime || (startTime = null);
    if (typeof(bChild) === 'undefined') {
        bChild = true;
    }

    var self = this;
    if ('object' === typeof(self.process[idx])) {
        return;
    }

    self.process[idx] = {
        pid : pid,
        name : name,
        idx : idx,
        time : startTime,
        startDate : global.utils.toDateTime(startTime),
        error : 0,
        state : 0,                  /// 1: by terminate admin.
        bChild : bChild,
        usage : null,
        process : null
    };

    self.usage.addPid(pid);
};

Constructor.prototype.getChildProcess = function(){
    var self = this;
    var iList = [];
    for (var key in self.cfg.services) {
        var services = self.cfg.services[key];
        if (!services.name || services.disable) continue;
        for (var i=0; i<services.machines.length; i++) {
            var machine = services.machines[i].split(':');
            var host = machine[0] || 'localhost';
            var idx = machine[1] || 0;
            if (host != 'localhost' && host != self.hostname) continue;
            if (!idx) continue;
            
            var process = {};
            process.name = services.name;
            process.service = services.service;
            process.idx = idx;
            process.machine = host;
            iList.push(process)
        }
    } 
    return iList;
}

Constructor.prototype.monitorChildProcess = function(cb) {
	var self = this;
	try {
		var iList = self.getChildProcess();
		iList.forEach(function(item){
			self.addProcessData(item.service, item.idx, 0, new Date(), 1);
			// self.startProcess(item);
		});

		setInterval(function() {
            var iList = [];
            var updateDate = global.utils.toDateTime(new Date());
            for(var idx in self.process) {
                var process = self.process[idx];
                process.usage = self.usage.getByPid(process.pid);
                iList.push({
                    idx : process.idx,
                    service : process.name,
                    hosts : global.hostname,
                    pid : process.pid,
                    state : process.usage.state,
                    cpu : process.usage.cpu,
                    memory : process.usage.memory,
                    rss : process.usage.rss,
                    startDate : process.startDate,
                    updateDate : updateDate
                });
            }
            self.sendServiceAuxLog(iList);
		}, self.cfg.services.monitorInterval);

	}catch (ex) {
		cb(ex);		
	}
};


Constructor.prototype.sendServiceAuxLog = function(iList) {
    var self = this;
    try {
        var iLog = [];
        iList.forEach(function(item) {
            if (!item.state) return;
            iLog.push({
                date : item.updateDate,
                service : item.service,
                idx : item.idx,
                hosts : item.hosts,
                pid : item.pid,
                cpu : item.cpu,
                memory : item.memory,
                rss : item.rss,
                state: item.state
            })
        });
        if (iLog.length > 0) {
        	//global.info(JSON.stringify(iLog));
            var output = {};
            self.redisSys.get(global.const.SERVICE_LIST_KEY, 60*1000, function(err,data) {
                output = data;
                for (var key in output) {
                    output[key].pid = 0;
                    output[key].state = 0;
                    output[key].cpu = 0;
                    output[key].memory = 0;
                    output[key].pid = 0;
                    output[key].rss = 0;
                }

                iLog.forEach(function(log) {
                    var value = output[log.idx];
                    if (value) {
                        value.pid = log.pid;
                        value.state = log.state;
                        value.cpu = log.cpu;
                        value.memory = log.memory;
                        value.rss = log.rss;
                        value.updateDate = log.date;
                        output[log.idx] = value;
                    }
                });
                // console.log(JSON.stringify(output));
                self.redisSys.set(global.const.SERVICE_LIST_KEY, JSON.stringify(output));
            });
        }
    } catch (ex) {
        global.warn('Constructor.sendServiceAuxLog. error:%s', ex.message);
        global.warn(ex.track);
    }	
};

Constructor.prototype.startProcess = function(item) {
	var self = this;
	try {
		self.addProcessData(item.service, item.idx);
        var child = self.process[item.idx];
        if (child.pid > 0) {
            return 'already_started_process';
        }	
        var service = util.format(__dirname + '/../%s/app.js', item.name);
        child.process = new (forever.Monitor)(service, {
            max : 1,
            slient : true,
            args : ["--idx=" + item.idx]        	
        });	
        
        child.process.on('exit', function() {
            var location = util.format('%s.%d', item.service, item.idx);
            child.pid = 0;
            child.time = new Date();
            global.debug('%s process terminated.', location);
            child.process = null;
            if (child.state !== 1) {
                setTimeout(function() {
                    self.startProcess(item);
                }, 5000)
            }
        });

        child.process.on('start', function(msg, data) {
            var location = util.format('%s.%d', item.service, item.idx);
            global.debug('running process. %s. pid=%s, path=%s', location, data.pid, service);
            child.pid = data.pid;
            child.state = 0;
            child.startDate = global.utils.toDateTime(new Date());
            child.time = new Date();
            self.usage.addPid(data.pid);
        });

        global.debug('start process : %s. idx[%d]', item.name, item.idx);
        child.process.start();
        return 'success';

	}catch (ex) {
        global.warn('Constructor.startProcess. service:%s, idx:%s', item.service, item.idx);
        global.warn(ex.track);
        return 'fail';		
	}
};

Constructor.prototype.getServiceList = function() {
    var self = this;
    var serviceCfg = global.base.cfg.services;
    var logs = {};
    try {
        for (var idx in global.base.process) {
            var item = global.base.process[idx];
            var host = 'localhost';
            var cfg = serviceCfg[item.name];
            if (cfg) {
                for (var j = 0; j < cfg.machines.length; ++j) {
                    var args = cfg.machines[j].split(':');
                    if (args[1] == item.idx) {
                        host = args[0];
                        break;
                    }
                }
            }

            logs[idx] = {
                idx : item.idx,
                service : item.name,
                hosts : host,
                pid : item.pid,
                state : item.state,
                cpu : item.usage ? item.usage.cpu : 0,
                memory : item.usage ? item.usage.memory : 0,
                rss : item.usage ? item.usage.rss : 0,
                startDate : item.startDate,
                updateDate : 0,
            };
        }

        self.redisSys.set(global.const.SERVICE_LIST_KEY, JSON.stringify(logs));
    }catch (ex) {
        global.warn(ex.track);
        return 'fail';
    }
};

module.exports.Constructor = Constructor;