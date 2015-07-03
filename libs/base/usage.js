
'use strict';
var spawn = require('child_process').spawn;
var __ = require('underscore');
var fs = require('fs');	

var Usage = function(interval) {
	interval || (interval = 5000);
	var self = this;

    self.pList = [];
    self.pFiles = {};
    self.pData = {};
    self.count = 0;
    self.interval = interval;

    setInterval(function() { self.run() }, self.interval);
};

Usage.prototype.run = function() {
    var self = this;
    var ps = spawn('ps', ['aux']);
    var iMsg = '', pids = [];

    for(var key in self.pData) {
        pids.push(parseInt(key));
    }

    ps.stdout.on('data', function (data) {
        iMsg += data.toString();
    });

    ps.on('close', function() {
        var iList = iMsg.toString().split('\n');
        iList.forEach(function(line) {
            var item = __.without(line.split(' '), '');
            var pid = parseInt(item[1]);
            if (__.indexOf(self.pList, pid) < 0)
                return;
            var pos = __.indexOf(pids, pid);
            pos >= 0 && (pids.splice(pos, 1));
            self.pData[pid] = {
                pid : pid,
                state : 1,
                cpu : parseFloat(item[2]),
                memory : parseFloat(item[3]),
                virtual : parseInt(item[4]),
                rss : parseInt(item[5])
            };
            //console.log(line);
        });
        pids.forEach(function(pid) {
            var pos = __.indexOf(self.pList, pid);
            delete self.pData[pid];
            pos >= 0 && (self.pList.splice(pos, 1));
        });
        //console.dir(self.pData);
    });
};

Usage.prototype.addPid = function(pid) {
    var self = this;
    if (typeof(pid) != 'number')
        return;
    var value = parseInt(pid);
    if (value === 0)
        return;
    if (__.indexOf(self.pList, value) < 0) {
        self.pList.push(value);
        self.pData[value] = {
            pid : pid,
            state : 0,
            cpu : 0,
            memory : 0,
            rss : 0
        };
    }
};

Usage.prototype.addPidFile = function(name, pidFile) {
    var self = this;

    self.addPidItem(name, pidFile);

    fs.watchFile(pidFile, function () {
        self.addPidItem(name, pidFile);
    });
};

Usage.prototype.addPidItem = function(name, pidFile) {
    var self = this;

    var pid = 0;
    if (fs.existsSync(pidFile)) {
        pid = parseInt(fs.readFileSync(pidFile));
    }

    self.delPidItem(name);

    try {
        self.pFiles[name] = {
            name : name,
            pid : pid,
            state : 0,
            cpu : 0,
            memory : 0,
            rss : 0,
            file : pidFile
        };
        if (pid > 0) {
            self.pData[pid] = {};
            self.pList.push(pid);
        }
    } catch (ex) {
        console.warn('Usage.addPidItem. name:%s, error:%s', name, ex.message);
    }
};

Usage.prototype.delPidItem = function(name) {
    var self = this;

    try {
        var item = self.pFiles[name];
        if (item) {
            delete self.pData[item.pid];
            var pos = __.indexOf(self.pList, item.pid);
            pos >= 0 && (self.pList.splice(pos, 1));
        }
    } catch (ex) {
        console.warn('Usage.delPidItem. name:%s, error:%s', name, ex.message);
    }
};

Usage.prototype.getByPid = function(pid) {
    var self = this;
    var item = self.pData[pid];
    return item ? item : {
        pid : pid,
        state : 0,
        cpu : 0,
        memory : 0,
        rss : 0
    }
};

Usage.prototype.getByName = function(name) {
    var self = this;
    var pItem = self.pFiles[name];
    var pid = 0;
    if (pItem) pid = pItem.pid;

    return self.getByPid(pid);
};


module.exports.Usage = Usage;


