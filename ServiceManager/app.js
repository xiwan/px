/**
 * @class ServiceManager
 */

var base = require('../libs/app_base');
var main = require('./constructor');

base.app('SM', main);

// var async = require('async');

// var appMain = new main.Constructor('SM');

// async.waterfall([
// 	function(callback) {appMain.init(callback);},
// 	function(callback) {appMain.run(callback);},
// ], function(err){
//     if (err) {
//         global.error(err);
//         process.exit(-1);
//     }
//     global.debug('%s.%d success daemon initialization...', appMain.name, appMain.idx);	
// });

