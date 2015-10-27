var apis = exports.apis = {};
var fs = require('fs');
var async = require('async');
var util = require('util');
var __ = require('lodash');
var base = require('../../libs/app_base');
var spawn = require('child_process').spawn;


apis.ApiServerMachineListReq = function(req, cb) {
    global.debug('AppParser.ApiServerMachineListReq Call.');
    try{
        global.base.systemDB.execute(global.base.sqls.ApiDeploy_getServiceMachineList(), function(err, item) {
            err && cb(err) && global.warn('AppParser.ApiServerMachineListReq error:%s', err.message);
            if(err) return;
            global.debug('AppParser.ApiServerMachineListReq Result. success');
            cb(null, {
                result : 'success',
                items : item
            });
        });
    } catch(ex) {
        global.warn('AppParser.ApiServerMachineListReq. error:%s', ex.message);
        cb(ex);
    }
}

apis.ApiServerDeployListReq = function(req, cb) {
    global.debug('AppParser.ApiServerDeployListReq Call.');
    try {
        global.base.getAppVersionData('UD', function(appData) {
	        global.base.systemDB.execute(global.base.sqls.ApiDeploy_getServiceDeployItem(), function(err, item) {
	            if(err) {
                    global.warn('AppParser.ApiServerDeployListReq error:%s', err.message);
                    return cb(err);
                }
	            
	            global.debug('AppParser.ApiServerDeployListReq Result. success');
	            cb(null, {
	                result : 'success',
	                items : item,
	                version : appData != null ? appData.deployVersion : 0
	            });
	        });
        });

    } catch (ex) {
        global.warn('AppParser.ApiServerDeployListReq. error:%s', ex.message);
        cb(ex);
    };
}

apis.ApiServerDeploySaveReq = function(req, cb) {
    global.debug('AppParser.ApiServerDeploySaveReq Call.');
    try {
        var idx = global.utils.getArrayIndex(global.base.uploads, 'name', req.body.name);
        if (idx < 0) throw new Error('not_existed_file');

        var upload = global.base.uploads[idx];
        var std = global.utils.toMySQLDate(new Date());
        var value = util.format('%s%s%s01', std.substr(2, 2), std.substr(5, 2), std.substr(8, 2));
        var item = {};
        var iPath = '';
        async.waterfall([
            function(next) {
                global.base.systemDB.execute(global.base.sqls.ApiDeploy_getServiceDeployItemMaxVer(std.substr(0, 10)), next);
            },
            function(results, next) {
                var version = 0;
                if (results.length != 0) version = results[0].version;
                item = {
                   hosts : req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                    patchNote : req.body.note,
                    writer : req.body.writer || "",
                    groupId : 0,
                    version : (version ? parseInt(version) + 1 : parseInt(value)),
                    uploadDate : std,
                    state : 1,
                    path : upload.path
                }
                next(null);
            },
            function(next) {
                var cols = [], vals = [];
                for(var col in item) {
                    cols.push(util.format('`%s`', col));
                    vals.push(util.format('"%s"', item[col]));
                }
                global.base.systemDB.execute(global.base.sqls.ApiDeploy_insertServiceDeployItem(cols, vals), next);
            },
        ], function(err, result) {
            if (err) {cb(err); return;}
            global.debug('AppParser.ApiServerDeploySaveReq Result. version:%s', item.version);
            cb(null, {
                result : 'success',
                version : item.version
            });
        });
    } catch (ex) {
        global.warn('AppParser.ApiServerDeploySaveReq. error:%s', ex.message);
        cb(ex);
    }
}

apis.ApiServerDeployFileReq = function(req, cb) {
    global.debug('AppParser.ApiServerDeployFileReq Call. ');
        try {
            var version = parseInt(req.body.version);
            if (typeof (version) !== 'number')
                throw new Error('invalid_deploy_version');

            var groupId = parseInt(req.body.groupId);
            if (typeof (version) !== 'number')
                throw new Error('invalid_deploy_groupId');
            var before = 1;
            var state = 2;

            async.waterfall([
                function(next) {
                    var where = {
                        name : 'version',
                        value : version
                    };
                    global.base.systemDB.finds([where], ['T_SERVICE_DEPLOYS'], function(err, results) {
                        // console.log('ApiServerDeployFileReq find T_SERVICE_DEPLOYS:'+JSON.stringify(results));
                        if (err) { next(err); return; }
                        if (results.length < 1) { 
                            next(Error('not_found_version')); 
                            return; 
                        }
                        var item = results[0];
                        if (item.state !== before && item.state !== state) {
                            next(new Error('invalid_deploy_state'));
                            return;
                        }

                        next(null);
                    });
                },
                function(next) {
                    global.base.systemDB.execute(global.base.sqls.ApiDeploy_updateServiceDeployItem(state, groupId, version), next);
                },
                function(result, next) {
                    var where = {
                        name : 'groupId',
                        value : groupId
                    };

                    global.base.systemDB.finds([where], ['T_MSG_HOST'], function(err, results) {
                        // console.log('ApiServerDeployFileReq find T_MSG_HOST:'+JSON.stringify(results));
                        if (err) { next(err); return; }
                        if (results.length < 1) {
                            next(new Error('not_found_host'));
                            return;
                        }
                        
                        next(null, results);
                    });
                }
            ], function(err, hosts){
                if (err) { cb(err); return; }

                var hostArr = [];
                __.each(hosts, function(host){
                    var hostCmd = host.account + '@' + host.ip + ':' + host.basePath;
                    hostArr.push(hostCmd);
                });

                var cmds = ['deploy', version, hostArr.join(','), util.format('tid=%s', global.base.genGid())];
                console.log('ApiServerDeployFileReq cmd:'+cmds);
                var redisCli = global.base.redis.message.get('AppCmds');
                if (!redisCli) return;
                redisCli.publish('AppCmds', JSON.stringify({action : 'deploy', body : cmds.join(' ')}));
                redisCli.unsubscribe('AppCmds');

                global.debug('AppParser.ApiServerDeployFileReq Result. version:%s', version);
                cb(null, {
                    result : 'success',
                    version : version
                });
            });
        } catch (ex) {
            global.warn('AppParser.ApiServerDeployFileReq. error:%s', ex.message);
            cb(ex);
        };
}

apis.ApiServerDeployApplyReq = function(req, cb) {
    global.debug('AppParser.ApiServerDeployApplyReq Call. ');
    try {
        var version = parseInt(req.body.version);
        if (typeof (version) !== 'number')
            throw new Error('invalid_deploy_version');

        var groupId = parseInt(req.body.groupId);
        if (typeof (version) !== 'number')
            throw new Error('invalid_deploy_groupId');
        var state = 3;
        var before = 2;

        async.waterfall([
            function(next) {
                var where = {
                    name : 'version',
                    value : version
                };
                global.base.systemDB.finds([where], ['T_SERVICE_DEPLOYS'], function(err, results) {
                    // console.log('ApiServerDeployApplyReq find T_SERVICE_DEPLOYS:'+JSON.stringify(results));
                    if (err) { next(err); return; }
                    if (results.length < 1) { 
                        next(new Error('not_found_version')); 
                        return; 
                    }
                    var item = results[0];
                    if (item.state !== before && item.state !== state) {
                        next(new Error('invalid_deploy_state'));
                        return;
                    }

                    next(null);
                });
            },
            function(next) {
                global.base.systemDB.execute(global.base.sqls.ApiDeploy_updateServiceDeployItem(state, groupId, version), next);
            },
            function(result, next) {
                var where = {
                    name : 'service',
                    value : global.base.cfg.deploy.domain
                };
                global.base.systemDB.finds([where], ['T_APP_BASE'], function(err, results) {
                    if (err) { next(err); return; }
                    if (results.length < 1 ) { next(new Error('not_found_service')); return; }
                    next(null, results[0].deployVersion);
                });
            },
            function(itemVer, next) {
            	if (itemVer == version) {
            		next(null, {});
            		return;
            	}
                global.base.systemDB.execute(global.base.sqls.ApiDeploy_updateAppData(version, global.base.cfg.deploy.domain), next);
            },
            function(result, next) {
                var where = {
                    name : 'groupId',
                    value : groupId
                };

                global.base.systemDB.finds([where], ['T_MSG_HOST'], function(err, results) {
                    // console.log('ApiServerDeployApplyReq find T_MSG_HOST:'+JSON.stringify(results));
                    if (err) { next(err); return; }
                    if (results.length < 1) {
                        next(new Error('not_found_host'));
                        return;
                    }
                    
                    next(null, results);
                });
            }
        ], function(err, hosts) {
            if (err) { cb(err); return; }
            var hostIps = [];
            __.each(hosts, function(host){
                hostIps.push(host.ip);
            });

            var cmds = ['rapply', version, hostIps.join(','), util.format('tid=%s', global.base.genGid())];
            console.log('ApiServerDeployApplyReq cmd:'+cmds);
            var redisCli = global.base.redis.message.get('AppCmds');
            if (!redisCli) return;
            redisCli.publish('AppCmds', JSON.stringify({action : 'rapply', body : cmds.join(' ')}));
            redisCli.unsubscribe('AppCmds');

            global.debug('AppParser.ApiServerDeployApplyReq Result. version:%s', version);
            cb(null, {
                result : 'success',
                version : version,
            });
        });
    } catch (ex) {
        global.warn('AppParser.ApiServerDeployApplyReq. error:%s', ex.message);
        cb(ex);
    }
}

apis.ApiServerDeployStopReq = function(req, cb) {
    global.debug('AppParser.ApiServerDeployStopReq Call. ');  
    try {
        var version = parseInt(req.body.version);
        if (typeof (version) !== 'number')
            throw new Error('invalid_deploy_version');

        var groupId = parseInt(req.body.groupId);
        if (typeof (version) !== 'number')
            throw new Error('invalid_deploy_groupId');
        var before = 3;
        var state = 2;

        async.waterfall([
            function(next) {
                var where = {
                    name : 'version',
                    value : version
                };
                global.base.systemDB.finds([where], ['T_SERVICE_DEPLOYS'], function(err, results) {
                    // console.log('ApiServerDeployStopReq find T_SERVICE_DEPLOYS:'+JSON.stringify(results));
                    if (err) { next(err); return; }
                    if (results.length < 1) { 
                        next(Error('not_found_version')); 
                        return; 
                    }
                    var item = results[0];
                    if (item.state !== before && item.state !== state) {
                        next(new Error('invalid_deploy_state'));
                        return;
                    }

                    next(null);
                });
            },
            function(next) {
                global.base.systemDB.execute(global.base.sqls.ApiDeploy_updateServiceDeployItem(state, groupId, version), next);
            },
            function(result, next) {
                var where = {
                    name : 'groupId',
                    value : groupId
                };

                global.base.systemDB.finds([where], ['T_MSG_HOST'], function(err, results) {
                    // console.log('ApiServerDeployStopReq find T_MSG_HOST:'+JSON.stringify(results));
                    if (err) { next(err); return; }
                    if (results.length < 1) {
                        next(new Error('not_found_host'));
                        return;
                    }
                    
                    next(null, results);
                });
            }
        ], function(err, hosts){
            if (err) { cb(err); return; }
            var hostIps = [];
            __.each(hosts, function(host){
                hostIps.push(host.ip);
            });
            var cmds = ['rstop', version, hostIps.join(','), util.format('tid=%s', global.base.genGid())];
            var redisCli = global.base.redis.message.get('AppCmds');
            if (!redisCli) return;
            redisCli.publish('AppCmds', JSON.stringify({action : 'rstop', body : cmds.join(' ')}));
            redisCli.unsubscribe('AppCmds');

            global.debug('AppParser.ApiServerDeployStopReq Result. version:%s', version);
            cb(null, {
                result : 'success',
                version : version,
            });
        });

    } catch (ex) {
        global.warn('AppParser.ApiServerDeployStopReq. error:%s', ex.message);
        cb(ex);
    }
}

apis.ApiServerDeployDeleteReq = function(req, cb) {
	global.debug('AppParser.ApiServerDeployDeleteReq Call. ');  
    try {
        var version = parseInt(req.body.version);
        if (typeof (version) !== 'number')
            throw new Error('invalid_deploy_version');
        var groupId = parseInt(req.body.groupId);
        if (typeof (version) !== 'number')
            throw new Error('invalid_deploy_groupId');
        async.waterfall([
            function(next) {
		        var where = {
		            name : 'version',
		            value : version
		        };
		        		        
		        global.base.systemDB.execute(global.base.sqls.ApiDeploy_delServiceDeployItem(version), next);
            },
            function(result, next) {
                var where = {
                    name : 'groupId',
                    value : groupId
                };

                global.base.systemDB.finds([where], ['T_MSG_HOST'], function(err, results) {
                    // console.log('ApiServerDeployDeleteReq find T_MSG_HOST:'+JSON.stringify(results));
                    if (err) { next(err); return; }
                    if (results.length < 1) {
                        next(new Error('not_found_host'));
                        return;
                    }
                    
                    next(null, results);
                });
            },
        ], function(err, hosts){
            if (err) { cb(err); return; }
            var hostArr = [];
            __.each(hosts, function(host){
                var hostCmd = host.account + '@' + host.ip + ':' + host.basePath;
                hostArr.push(hostCmd);
            });

            var cmds = ['rdel', version, hostArr.join(','), util.format('tid=%s', global.base.genGid())];
            var redisCli = global.base.redis.message.get('AppCmds');
            if (!redisCli) return;
            redisCli.publish('AppCmds', JSON.stringify({action : 'rdel', body : cmds.join(' ')}));
            redisCli.unsubscribe('AppCmds');

            cb(err, {
                result : 'success',
                version : version
            });
        });
    } catch (ex) {
        global.warn('AppParser.ApiServerDeployDeleteReq. error:%s', ex.message);
        cb(ex);
    }
}