

'use strict';

var ini = require('ini');
var async = require('async');
var util = require('util');
var fs = require('fs');

/**
* @mehtod Constructor
* @param {String} name: Process name
* @param {String} local: Local Property
*/
var Constructor = function (name, local) {

    global.utils = require('./utils');
    global.test = console.test;
    global.info = console.log;
    global.debug = console.log;
    global.warn = console.warn;
    global.error = console.error;

    this.logger = null;
    this.startDate = global.utils.toDateTime(new Date());
    this.name = name;
    this.idx = 0;

    this.property = {};         // common property
    this.local = local;         // local property

    this.versions = [];
    this.gids = null;
    this.cfg = null;
    this.services = null;

    this.waitForTerminate = 1;

}

Constructor.prototype.terminate = function(signal) {
    var self = this;
    self.onTerminated();
    setTimeout(function() {
        global.debug('%s.%s %s...', self.name, self.idx, signal);
        process.exit(0);
    }, self.waitForTerminate);
};


Constructor.prototype.onTerminated = function() {};

/**
* @method init
* 1. parse argv
* 2. get db connection info
* 3. init service based on config
*/
Constructor.prototype.init = function(cb) {
	var self = this;
	try {
        global.argv = require('optimist').argv;
        global.hostname = require('os').hostname(); // get current hostname
        global.base = self; // global.base is current object
        self.idx = global.argv.idx?global.argv.idx : 0;
        self.ipAddr = global.utils.getIPAddress();
        global.argv.cfg || (global.argv.cfg = '');

	    if (fs.existsSync(global.argv.cfg)) {
	        var config = ini.parse(fs.readFileSync(global.argv.cfg, 'utf-8'));
	        self.cfg = config.mysql.property;
	        process.env.cfg = JSON.stringify(self.cfg);

	        self.services = config.services;

	    } else {
	        self.cfg = JSON.parse(process.env.cfg);
	    }
	    // global.debug(self.cfg);
	    process.on('SIGINT', function () { self.terminate('SIGINT'); });
		process.on('SIGTERM', function () { self.terminate('SIGTERM'); });
		process.on('uncaughtException', function(err){
			if (global.base && global.base.action) {

			}else {
                global.error('-----------uncaughtException-BEGIN--------------');
                global.error(err.stack);
                global.error('-----------uncaughtException-END--------------');
            }
            self.terminate('SIG_ERR');
		});

	    cb(null);
	}catch(ex) {
        global.warn(ex.stack);
        cb(ex);		
	}

};


module.exports.Constructor = Constructor;



