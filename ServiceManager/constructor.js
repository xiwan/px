'use strict';

var base = require('../libs/app_base');
var util = require('util');
var __ = require('underscore');
var async = require('async');
var forever = require('forever-monitor');

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);

    this.process = {};
    this.service = [];
    this.cmds = null;
    this.parser = null;
    this.deployDir = null;
    this.usage = null;
    this.mode = null;	
};
util.inherits(Constructor, base.Constructor);

Constructor.prototype.run = function(cb) {
	var self = this;

	self.usage = new base.Usage();
	self.addProcessData(self.name, self.idx, process.pid, self.startDate, 0);

    self.hostname = require('os').hostname();
    self.ipAddr = global.utils.getIPAddress();

	self.monitorChildProcess(cb);
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

Constructor.prototype.monitorChildProcess = function(cb) {
	var self = this;
	try {
		var iList = [];
		for (var idx in self.cfg.services) {
			var services = self.cfg.services[idx];
			if (!services.name) continue;
			for (var i=0; i<services.machines.length; i++) {
				var process = {};
				process.name = services.name;
				process.service = services.service;
				process.idx = services.idx++;
				process.machine = services.machines[0]
				iList.push(process)
			}
		}

		iList.forEach(function(item){
			self.addProcessData(item.service, item.idx, 0, new Date(), 1);
			self.startProcess(item);
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
                ipAddr : self.ipAddr,
                pid : item.pid,
                cpu : item.cpu,
                memory : item.memory,
                rss : item.rss
            })
        });
        if (iLog.length > 0) {
        	//global.info(JSON.stringify(iLog));
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
        var service = util.format('./%s/app.js',item.name);
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

module.exports.Constructor = Constructor;