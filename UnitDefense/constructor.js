'use strict';

var base = require('../libs/app_base');
var util = require('util');
var __ = require('underscore');
var async = require('async');

var Constructor = function(name) {
	base.Constructor.apply(this, arguments);
};
util.inherits(Constructor, base.Constructor);

Constructor.prototype.run = function(cb) {
	var self = this;
	setInterval(function(){
		console.log('xxxxx2')
	}, 6000)	
	cb(null);
};

module.exports.Constructor = Constructor;