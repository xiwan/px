'use strict'

var mConn = require('../../libs/base/mysqlConn');
var mysql = require('mysql');
var async = require('async');
var util = require('util');

var GameSystem = exports.GameSystem = function(property) {
    var self = this;
    self.mConn = mConn.createObject(property, 'systemDB');
};

GameSystem.prototype.test = function(cb){
	var self = this;
	try {
		self.mConn.use('slave');

        var qryList = [];
        qryList.push({ sql : 'SELECT * FROM T_APP_BASE where appId = ?', data : [global.const.appId] });

		self.mConn.execute(qryList, cb);

	}catch (ex) {
		cb(ex);
	}
};

exports.createObject = function (property) {
    return new GameSystem(property);
};