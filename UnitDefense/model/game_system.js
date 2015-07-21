'use strict'

var mysql = require('mysql');
var async = require('async');
var util = require('util');

var mConn = require('../../libs/base/mysqlConn');
var iApp = require('../../libs/schema/test2/App.js');

var GameSystem = exports.GameSystem = function(property) {
    var self = this;
    self.app = mConn.createObject(property, 'systemDB');
    self.app.init(iApp.getDictionary());
};

GameSystem.prototype.testABC = function(cb){
	var self = this;
	try {
		self.app.use('master');

        var where = {name: 'appId', value: global.const.appId};
        self.app.finds([where], ['T_APP_BASE'], function(err, results){
            if (err)
                return cb(err);
            cb(null, results);     	
        });
		

	}catch (ex) {
		cb(ex);
	}
};

GameSystem.prototype.test1 = function(cb){
	var self = this;
	try {
		self.app.use('slave');

        var qryList = [];
       	qryList.push({ sql : 'SELECT * FROM T_APP_BASE where appId = ?', data : [global.const.appId] });
        qryList.push(util.format('SELECT * FROM T_APP_BASE where appId = "%s"', global.const.appId));
        self.app.execute(qryList, cb);
       
	}catch (ex) {
		cb(ex);
	}
};

exports.createObject = function (property) {
    return new GameSystem(property);
};