{
    'use strict';

    var async = require('async');
    var fs = require('fs');
    var base = require('./base/constructor');
    var usage = require('./base/usage.js');
    var channel = require('./base/channel.js');
    var policy = require('./base/policy.js');
    var server = require('./base/proxyServer.js');
    var httpServer = require('./base/httpServer.js');
    var appServer = require('./base/appServer.js');
    var mConn = require('./base/mysqlConn');

    module.exports.Constructor = base.Constructor;
    module.exports.Usage = usage.Usage;
    module.exports.ProxyServer = server.ProxyServer;
    module.exports.Policy = policy;
    module.exports.Channel = channel;
    module.exports.HttpServer = httpServer;
    module.exports.AppServer = appServer;
    module.exports.MysqlConn = mConn;

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


    module.exports.apiDetector = function(apis, dirname){
        fs.readdir(dirname, function(err, files) {
            if (err) return;
            files.forEach(function(f) {
                if (f != 'main.js'){
                    var __apis = require(dirname + '/' + f.replace('.js', '')).apis;
                    for (var key in __apis) {
                        var handler = __apis[key];
                        if (!apis[key]) {
                            apis[key] = handler;
                        }else {
                            global.warn('there is duplicate handlers in apis: %s, please rename it', key);
                        }
                    }
                }
            });
        }); 
        
    };

}