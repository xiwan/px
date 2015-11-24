'use strict'

var fs = require('fs');
var base = require('../../libs/app_base');

var apis = exports.apis = {};
base.apiDetector(apis, __dirname);