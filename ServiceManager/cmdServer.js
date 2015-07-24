'use strict';

var net = require('net');
var util = require('util');
var fs = require('fs');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var async = require('async');

var CmdServer = function(name, portNo, ipAddr) {
	ipAddr || (ipAddr = '127.0.0.1');
	var self = this;

	self.portNo = portNo;
	self.ipAddr = ipAddr;

	self.server = null;
	self.clients = {};
	self.services = {};
	self.prompt = util.format("%s %s:%d $ ", name, ipAddr, portNo);

	self.handler = {
		register : function(client, argv, cb) { self.register(client, argv, cb); },
		broadcast : function(client, argv, cb) { self.broadcast(client, argv, cb); },
		transpass : function(client, argv, cb) { self.transpass(client, argv, cb); },
		build : function(client, argv, cb) {self.build(client, argv, cb); },
		get : function(client, argv, cb) { self.get(argv, cb); },
		start : function(client, argv, cb) { self.start(client, argv, cb); },
		stop : function(client, argv, cb) { self.stop(argv, cb); },
		restart : function(client, argv, cb) { self.restart(client, argv, cb); },
		deploy : function(client, argv, cb) { self.deploy(argv, cb); },
		apply : function(client, argv, cb) { self.apply(client, argv, cb); },
		rdate : function(client, argv, cb) { self.rdate(client, argv, cb); },
	};
};

CmdServer.prototype.run = function() {
	var self = this;
	global.debug('CmdServer.run. %s:%d', self.ipAddr, self.portNo);
	//self.handler = handler;

	self.server = net.createServer(function(client){
		client.id = global.base.genGid();
		self.clients[client.id] = client; // cache the connection

		global.debug('CmdServer.run. server connected. id=%s', client.id);

		var lastMsg = '';
		client.on('end', function(){
            global.debug('CmdServer.run. server disconnected. id=%s', client.id);
            delete self.clients[client.id];
		});
		client.on('data', function(msg){
			var iCmd = msg.toString().trim();
            if (iCmd === '/') {
                msg = lastMsg;
                client.write(lastMsg + '\n\r');
            } else if (iCmd === 'exit') {
                client.emit('end');
                client.destroy();
                return;
            } else {
                lastMsg = msg;
            }
            self.onMsg(client, msg);
		});
		client._tid = setTimeout(function(){
			try {
                client.write(self.prompt);
                client._bFirst = false;
			} catch (ex) {
				global.warn('exception : %s', ex.message);
			}
		}, 100);
	});
	
	self.server.listen(self.portNo, self.ipAddr);
};

CmdServer.prototype.onMsg = function(client, msg) {
	client || (client = {write: function() {} });
	var self = this;
	var param = self.parseMsg(client, msg);
	var iFunction = self.handler[param.command];
	if ('function' !== typeof(iFunction)) {
        client.write(util.format('unregistered command : %s\n\r', param.command));
        client.write(self.prompt);
    } else {
    	iFunction(client, param, function(err, result) {
            try {
                if (err) {
                    global.warn('CmdServer.onMsg error:%s', err.toString());
                    if(client) client.write(err.toString());
                } else {
                    client.write(result);
                }
                !client.session && (client.write('\n\r' + self.prompt));
            } catch (ex) {
                global.warn('CmdServer.onMsg. error:%s', ex.message);
            }
    	});
    }
};

CmdServer.prototype.parseMsg = function(client, message){
	var param = message.toString().trim().split(' ');
	var iMsg = {
		command : param[0],
		id : client.id,
		subs : [],
	};
	var iLen = param.length;
	for (var i=1; i<iLen; i++) {
		var item = param[i].split('=');
        if (item.length !== 2) {
            iMsg.subs.push(param[i].trim());
        } else {
            iMsg[item[0]] = item[1];
        }
	}
	return iMsg;
};

CmdServer.prototype.writePromptTitle = function(client) {
    var self =this;
    client.write(util.format('%s%s%s\n',
        global.utils.fillStr('NAME', 5),
        global.utils.fillStr('IDX', 5),
        global.utils.fillStr('RESULT', 25)
    ));
};

/**
* @method: register service
*/
CmdServer.prototype.register = function(client, argv, cb) {
    var self = this;
    var ack = {
        cmd : 'register',
        result : 'success'
    };
    var name = argv.subs[0];
    var idx = argv.subs[1] ? parseInt(argv.subs[1]) : null;
    try {
        if (typeof (name) !== 'string' || typeof(idx) !== 'number') {
            throw new Error('invalid_parameter');
        }
        if ( typeof(self.services[name]) !== 'object' ) {
            self.services[name] = {};
        }
        var service = self.services[name];
        service[idx] = argv.id;
        client.session = true;
        client._tid && clearTimeout(client._tid);
        console.log(self.services)
        global.debug('CmdServer.register. service:%s.%d', name, idx);
    } catch(ex) {
        ack.result = ex.message;
    } finally {
        cb(null, JSON.stringify(ack));
    }
};

/**
* @method: broadcast message to all services
*/
CmdServer.prototype.broadcast = function(client, argv, cb) {
    var self = this;
    var cmd = '';
    var iLen = argv.subs.length;
    for(var i=0; i<iLen; i++) {
        cmd += (argv.subs[i] + ' ');
    }
    var ack = {
        result : 'success',
        client : []
    };
    for(var name in self.services) {
        var service = self.services[name];
        for(var idx in service) {
            var id = service[idx];
            var client = self.clients[id];
            if (client) {
                client.write(cmd + '\n\r');
                ack.client.push({
                    name : name,
                    idx : idx
                })
            }
        }
    }
    cb(null, JSON.stringify(ack));
};

CmdServer.prototype.transpass = function(client, argv, cb) {
};

/**
* @method: get process-status
*/
CmdServer.prototype.get = function(argv, cb) {
	var self = this;
	if (argv.subs.length === 0) {
        cb(null, 'invalid parameter. get sub-action');
        return ;
	}

	switch (argv.subs[0]) {
		case 'process-status' :
			getProcessStatus(argv, cb);
			break;
		default: 
			cb(null, 'invalid parameter:'+argv.subs[0]);
	}

	function getProcessStatus(argv, cb) {
		var output = [];
		for (var idx in global.base.process) {
			var item = global.base.process[idx];
			if (argv.name && item.name.indexOf(argv.name) < 0) continue;
			if (argv.idx && item.idx != argv.idx) continue;
			if ('string' === typeof(argv.run)
				&& (argv.run == 'true' && item.pid === 0) || (argv.run == 'false' && item.pid > 0)) 
				continue;

			output.push({
				pid : item.pid,
				name : item.name,
				idx : item.idx,
				time : item.time,
				cpu : item.usage ? item.usage.cpu : 0,
				memory : item.usage ? item.usage.memory : 0,
				rss : item.usage ? item.usage.rss : 0,
			});
		}
		if (argv.out === 'json') {
			cb(null, JSON.stringify(output));
		}else {
            var iMsg = util.format('%s%s%s%s  %s%s\n',
                global.utils.fillStr('PID', 10),
                global.utils.fillStr('NAME', 5),
                global.utils.fillStr('IDX', 5),
                global.utils.fillStr('TIME', 25),
                global.utils.fillStr('CPU', 10),
                global.utils.fillStr('MEMORY', 13)
            );
	        for(var i= 0, iLen=output.length; i<iLen;i++) {
                var out = output[i];
                iMsg += util.format('%s%s%s%s  %s%s\n',
                    global.utils.fillStr(out.pid, 10),
                    global.utils.fillStr(out.name, 5),
                    global.utils.fillStr(out.idx, 5),
                    global.utils.fillStr(out.time, 25),
                    global.utils.fillStr(out.cpu +' %', 10),
                    global.utils.fillStr(out.memory + '%(' + parseInt(out.rss/1024) + 'MB)', 13)
                );
            }
            cb(null, iMsg);
		}
	};
};

/**
* @method: start process
 * ex) start process all 
 *     start process WP
 *     start process WP 501
*/
CmdServer.prototype.start = function(client, argv, cb) {
	var self = this;
    if (argv.subs.length < 2) {
        cb(null, 'invalid parameter. start action process-name');
        return ;
    }	
    switch(argv.subs[0]) {
        case 'process' :
            startProcess(client, argv, cb);
            break;
        default:
            cb(null, 'invalid parameter:' + argv.subs[0]);
    }

    function startProcess(client, argv, cb) {
    	var command = argv.subs[1].toUpperCase();
    	var processList = global.base.getChildProcess();
    	var iList = [];
    	processList.forEach(function(item) {
    		for (var i=1; i<=item.count; i++) {
    			if (item.service === 'SM') continue;
    			global.base.addProcessData(item.service, item.idx, 0, new Date(), 1);
                iList.push({
                    idx : item.idx,
                    name : item.name,
                    service : item.service,
                    process : item.process
                });
    		}
    	});

		var setTime = 0;
		if (argv.subs[2]) {
            if(isNaN(parseInt(argv.subs[2]))){
                client.write('NaN Error');
                return cb('NaN Error');
            }
            setTime  = parseInt(argv.subs[2]) * 1000;
		}
        if(setTime > 999999){
            client.write('setTime Error');
            return cb('setTime error');
        }
        self.writePromptTitle(client);

    	if (command == 'ALL') {
    		// start all processes
            async.eachSeries(processList, function(process, callback){
            	setTimeout(function(){
            		try {
            			var child = global.base.process[process.idx];
            			var msg = '';
                        if ('object' === typeof(child) && child.pid > 0) {
                            msg = 'already started process';
                        } else {
                            msg = global.base.startProcess(process);
                        }
                        if (msg !== '') {
                            client.write(util.format('%s%s%s\n',
                                global.utils.fillStr(process.service, 5),
                                global.utils.fillStr(process.idx, 5),
                                global.utils.fillStr(msg, 25)
                            ));
                        }
                        callback(null);
            		} catch (ex) {
            			callback(ex);
            		}
            	}, setTime);
            }, function(err){
            	cb(err, '');
            });

    	}else {
            var argObj = argv.subs[1].split('.');
            var serviceName = argObj[0].toUpperCase();
            var idx = argObj[1] ? parseInt(argObj[1]) : 0;

            var iProcess = [];
            processList.forEach(function(procs){
                if(serviceName === procs.service)
                    iProcess.push(procs);
            });

            async.eachSeries(iProcess, function(process, callback){
            	setTimeout(function(){
            		try {
                        if ( !(serviceName === process.service) || !(idx === 0 || idx === parseInt(process.idx))){
                            return callback(null);
                        }
                        var child = global.base.process[process.idx];
                        var msg = '';
                        if ('object' === typeof(child) && child.pid > 0) {
                            msg = 'already started process';
                        } else {
                            msg = global.base.startProcess(process);
                        }
                        if (msg !== '') {
                            client.write(util.format('%s%s%s\n',
                                global.utils.fillStr(process.service, 5),
                                global.utils.fillStr(process.idx, 5),
                                global.utils.fillStr(msg, 25)
                            ));
                        }
                        callback(null);
            		} catch (ex) {
            			callback(ex);
            		}
            	}, setTime);
            }, function(err){
                cb(err, '');
            });
    	}

    };
};

/**
* @method: start process
 * ex) stop process all 
 *     stop process WP
*/
CmdServer.prototype.stop = function(argv, cb) {
    var self = this;
    if (argv.subs.length < 2) {
        cb(null, 'invalid parameter. start action process-name');
        return ;
    }
    switch(argv.subs[0]) {
        case 'process':
            stopProcess(argv, cb);
            break;
        default:
            cb(null, 'invalid parameter:'+argv.subs[0]);
    }

    function stopProcess(argv, cb) {
        var service = argv.subs[1].toUpperCase();
        var idx = argv.subs[2] ? parseInt(argv.subs[2]) : 0;

        var output = [];
        for(var i in global.base.process) {
            var child = global.base.process[i];
            if (!child.bChild) {
                continue;
            }
            if ( !(service === 'ALL' || service === child.name) || !(idx === 0 || idx === parseInt(child.idx)) ) {
                continue
            }
            var msg = '';
            if (child.pid > 0 && child.process) {
                child.state = 1;
                process.kill(child.pid, 'SIGTERM');
                //child.process.kill();
                msg = 'success';
            } else {
                msg = 'already stopped process';
            }
            if (msg !== '') {
                output.push({
                    name : child.name,
                    idx : child.idx,
                    result : msg
                });
            }
        }

        if (argv.out === 'json') {
            var iAck = {
                cmd : 'stop',
                body : output
            };
            cb(null, JSON.stringify(iAck));
        } else {
            var iMsg = util.format('%s%s%s\n',
                global.utils.fillStr('NAME', 5),
                global.utils.fillStr('IDX', 5),
                global.utils.fillStr('RESULT', 25)
            );
            for(var o= 0, oLen=output.length; o<oLen;o++) {
                var out = output[o];
                iMsg += util.format('%s%s%s\n',
                    global.utils.fillStr(out.name, 5),
                    global.utils.fillStr(out.idx, 5),
                    global.utils.fillStr(out.result, 25)
                );
            }
            cb(null, iMsg);
        }

    };
};

/**
* @method: restart process
 * ex) restart process all 
 *     restart process WP
*/
CmdServer.prototype.restart = function(client, argv, cb) {
    var self = this;
    self.stop(argv, function(err) {
        if (err) {
            cb(err);
            return;
        }

        setTimeout(function() {
            self.start(client, argv, cb);
        }, 5000)
    })
};

CmdServer.prototype.apply = function(client, argv, cb) {
    var self = this;
    argv.subs = ['process', 'all'];
    argv.out = 'json';
    self.restart(client, argv, cb);
};

/**
* @method: build module
 * ex) build all 
 *     build wa
*/
CmdServer.prototype.build = function(client, argv, cb) {
	var self = this;
	var service = argv.subs[0].toUpperCase();
	var baseDir = './';
	var allMsg = [];

	if (service === 'ALL') {
		async.eachSeries(global.base.cfg.services, bulldStub, function(err){
			cb(err, allMsg.join('\n'));
		})
	}else {
		bulldStub(global.base.cfg.services[service], cb);
	}

	function bulldStub(cfg, cb) {
		if (!cfg || !cfg.name) {
			cb(null, 'invalid parameter. cant build service: ' + service);
			return;
		}
		var iDir = baseDir + cfg.name;
		var iApp = iDir + '/app.js';
		var iConstructor = iDir + '/constructor.js';
		var iCommands = iDir + '/commands.js';
		var iApis = iDir + '/apis/main.js';

		var iAppCtx = [];
		var iConstructorCtx = [];
		var iCommandsCtx = [];
		var iApisCtx = [];

		iAppCtx.push('/**');
		iAppCtx.push('* @class ' + cfg.name);
		iAppCtx.push('*/');
		iAppCtx.push('');
		iAppCtx.push('var base = require(\'../libs/app_base\');');
		iAppCtx.push('var main = require(\'./constructor\');');
		iAppCtx.push('');
		iAppCtx.push('var appMain = new main.Constructor(\'' + cfg.service + '\');');
		iAppCtx.push('base.app(appMain);');

		iConstructorCtx.push('\'use strict\'');
		iConstructorCtx.push('');
		iConstructorCtx.push('var util = require(\'util\');');
		iConstructorCtx.push('var __ = require(\'underscore\');');
		iConstructorCtx.push('var async = require(\'async\');');
		iConstructorCtx.push('var base = require(\'../libs/app_base\');');
		iConstructorCtx.push('var commands = require(\'./commands\');');
		iConstructorCtx.push('var apis = require(\'./apis/main\');');
		iConstructorCtx.push('');
		iConstructorCtx.push('var Constructor = function(name) {');
		iConstructorCtx.push('\tbase.Constructor.apply(this, arguments);');
		iConstructorCtx.push('};');
		iConstructorCtx.push('util.inherits(Constructor, base.Constructor);');
		iConstructorCtx.push('');
		iConstructorCtx.push('Constructor.prototype.run = function(cb) {');
		iConstructorCtx.push('\tvar self = this;');
		iConstructorCtx.push('\ttry {');
		iConstructorCtx.push('\t\t// init policy instance & load commands');
		iConstructorCtx.push('\t\tself.policy = base.Policy.createObject();');
		iConstructorCtx.push('\t\tself.overloading(apis, commands);');
		iConstructorCtx.push('');
		iConstructorCtx.push('\t\t//init rpc server or client');
		iConstructorCtx.push('\t\tself.initForRPC(self.cfg.services[self.name].rpc, self.policy);');
		iConstructorCtx.push('');
		iConstructorCtx.push('\t');
		iConstructorCtx.push('\t} catch (ex) {');
		iConstructorCtx.push('\t\tcb(ex)');
		iConstructorCtx.push('\t};');
		iConstructorCtx.push('};');
		iConstructorCtx.push('');
		iConstructorCtx.push('module.exports.Constructor = Constructor;');

		iCommandsCtx.push('module.exports = {');
		iCommandsCtx.push('\t');
		iCommandsCtx.push('};');
		iCommandsCtx.push('');

		iApisCtx.push('\'use strict\'');
		iCommandsCtx.push('');
		iApisCtx.push('var apis = exports.apis = {};');

		try { 
			fs.mkdirSync(iDir); 
			fs.mkdirSync(iDir + '/apis'); 

			fs.writeFileSync(iApp, iAppCtx.join('\n'), 'utf8');
			fs.writeFileSync(iConstructor, iConstructorCtx.join('\n'), 'utf8');
			fs.writeFileSync(iCommands, iCommandsCtx.join('\n'), 'utf8');
			fs.writeFileSync(iApis, iApisCtx.join('\n'), 'utf8');

			var msg = util.format('It\'s saved! %s', cfg.name);
			allMsg.push(msg);
			cb(null, msg);
		} catch (ex) {
			allMsg.push(ex.message);
			cb(null, ex.message)
		}

	}
}

module.exports.CmdServer = CmdServer;
	
