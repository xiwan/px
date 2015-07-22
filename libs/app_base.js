{
    'use strict';

    var async = require('async');
    var base = require('./base/constructor');
    var usage = require('./base/usage.js');
    var channel = require('./base/channel.js');
    var policy = require('./base/policy.js');
    var server = require('./base/proxyServer.js');

    module.exports.Constructor = base.Constructor;
    module.exports.Usage = usage.Usage;
    module.exports.ProxyServer = server.ProxyServer;
    module.exports.Policy = policy
    module.exports.Channel = channel

    module.exports.app = function(appMain){
		//var appMain = new main.Constructor(name);

		async.waterfall([
			function(callback) {appMain.init(callback);},
			function(callback) {appMain.run(callback);},
		], function(err){
		    if (err) {
		        global.error(err);
		        process.exit(-1);
		    }
		    global.debug('%s.%d %s, success daemon initialization...', appMain.name, appMain.idx, appMain.startDate);	
		});
	};

}