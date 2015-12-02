'use strict'

var fs = require('fs');
var async = require('async');
var util = require('util');
var __ = require('lodash');
var crc = require('../../libs/crc');
var langUtils = require('../utils/lang_utils');
var appUtils = require('../utils/app_utils');
var miscUtils = require('../utils/misc_utils');
var base = require('../../libs/app_base');

var apis = exports.apis = {};

base.apiDetector(apis, __dirname);

apis.ApiFileUploadReq = function(req, cb) {
	global.debug('AppParser.ApiFileUploadReq Call.');
	try {
		var iAry = [];
		for (var key in req.files) {
			iAry.push(key);
		}

		if (iAry.length === 0) {
            cb(new Error('empty_file'));
            return;
		}

		var iFile = req.files[iAry[0]];
        var iAck = {
            result : 'success',
            name : iFile.name
        };

        if (fs.existsSync(iFile.path)) {
        	var idx = global.utils.getArrayIndex(global.base.uploads, 'name', iFile.name);
        	if (idx < 0) {
        		global.base.uploads.push({
        			name : iFile.name,
        			path : iFile.path
        		});
        	} else {
        		global.base.uploads[idx].path = iFile.path;
        	}
        }else {
        	iAck.result = 'not_found_file';
        }

        global.debug('AppParser.ApiFileUploadReq Result. success.');
        cb(null, iAck);

	} catch (ex) {
        global.debug('AppParser.ApiFileUploadReq error: %s', ex.message);
        cb(ex);
	}
};

apis.ApiConvertToJson = function(req, cb) {
	var body = req.body;
	global.debug('AppParser.ApiConvertToJson Call.');

	try {
		var idx = global.utils.getArrayIndex(global.base.uploads, 'name', body.file);
		if (idx < 0) {
			throw new Error('invalid_protocol_parameter');
		}
		
        var item = global.base.uploads[idx];
        var filePath = item.path;
        var ack = {
            result : 'success',
            tables : null,
            ignores : []
        };

        var tables = appUtils.loadExcel2Json(filePath, ack.ignores);
        if (null === tables) {
            ack.result = 'failed_converting_json';
        } else {
            item['json'] = tables;
            ack.tables = {};
            for (var name in tables) {
                ack.tables[name] = tables[name].rows;
            }
        }

        global.debug('AppParser.ApiConvertToJson Result. success.');
        cb(null, ack);
        process.nextTick(function() {
            try { fs.unlinkSync(filePath); } catch (ex) {}
        });

	} catch (ex){
        global.debug('AppParser.ApiConvertToJson error: %s', ex.message);
        cb(ex);
    }
};

apis.ApiCheckExcelSheets = function(req, cb) {
    var self = apis;
    global.debug('AppParser.ApiCheckExcelSheets Call.');
    try {
        var body = req.body;
        var iNum = parseInt(body.num);
        var iFile = miscUtils.getApplyFile(body);
        var iExcel = iFile.excel;
        var sameSheets = [];
        var keys = Object.keys(iFile.data);
        keys.forEach(function(key) {
            var iSheet = key;
            var pos = -1;
            var item = __.find(global.base.dataVersions, function(it) {
                return it.sheet == iSheet && it.name == iExcel;
            });
            // for (var i = 0; i < global.base.dataVersions.length; ++i) {
            //     var item = global.base.dataVersions[i];
            //     if (!item) continue;
            //     if (item.sheet == iSheet && item.name == iExcel) {
            //         pos = i;
            //         break;
            //     }
            // }

            // if (pos > -1) {
            if(typeof(item) != 'undefined') {
                sameSheets.push({
                    excel : iExcel,
                    sheet : iSheet
                });
            }
        });
        if (sameSheets.length > 0) {
            global.debug('AppParser.ApiCheckExcelSheets Result. already have');
            cb(null, { result : 'same', same : sameSheets });
        } else {
            global.debug('AppParser.ApiCheckExcelSheets Result. success');
            cb(null, { result : 'success' });
        }
    } catch (ex) {
        global.warn('AppParser.ApiCheckExcelSheets. error:%s', ex.message);
        global.warn(ex.stack);
        cb(ex);  
    }
};

apis.ApiApplyTables = function(req, cb) {
	var self = apis;
	global.debug('AppParser.ApiApplyTables Call.');
	try {
        var body = req.body;
        var iNum = parseInt(body.num);
        var iFile = miscUtils.getApplyFile(body);
        var iExcel = iFile.excel;
        var keys = Object.keys(iFile.data);
        var qryList = [], changeLog = [];

        var fileName = iFile.excel.replace('.xlsx', '');
        keys.forEach(function(key) {
            var iSheet = key;
            var sheet = iFile.data[key];
            // var pos = -1;

            var item = __.find(global.base.dataVersions, function(it) {
                return it.sheet == iSheet && it.name == iExcel;
            });

            //for (var i = 0; i < global.base.dataVersions.length; ++i) {
            //    var item = global.base.dataVersions[i];
            //    if (!item) continue;
            //    if (item.sheet == iSheet && item.name == iExcel) {
            //        pos = i;
            //        break;
            //    }
            //}
            var base64 = new Buffer(JSON.stringify(sheet)).toString('base64');
            var version = 0;
            if (typeof item === "undefined") {
                global.base.dataVersions.push({
                    sheet : key,
                    category : iFile.category,
                    version : 1,
                    json : base64,
                    crc : 0,
                    name : iFile.excel,
                });
                version = 1;
                qryList.push(
                    global.base.sqls.ApiApplyTables_insertAppData(global.const.appId, key, iFile.excel, iFile.category, version)
                );
            } else {
                // var item = global.base.dataVersions[pos];
                //if (item.json !== base64) {
                    item.version++;
                    item.json = base64;
                    version = item.version;
                    qryList.push(
                        global.base.sqls.ApiApplyTables_updateAppData(item.version, global.const.appId, key, iFile.excel)
                    );
                //}
            }
            if (version > 0) {
                changeLog.push({
                    sheet : key,
                    cols : sheet.cols,
                    json : JSON.stringify({Tables : sheet.data}),
                    version : version
                });
            }
        });

		if(changeLog.length > 0){
			var job = global.base.addAsyncJob('ApiApplyTables');
            job.file = iExcel;
			process.nextTick(function() {
				async.waterfall([
					function (callback) { 
                        //appUtils.ftpUploadReq(iNum, changeLog, job, callback); 
                        appUtils.ftpUploadCombineReq(iNum, changeLog, job, fileName, callback);
                    },
                    function (iFiles, callback) {
                        // iFiles
                        iFiles.forEach(function(fileObj){
                            if(fileObj.sheet !== 'VersionList'){

                                if (typeof fileObj.version === "undefined" || !fileObj.version) {
                                    var item = __.find(global.base.dataVersions, function(it) {
                                        return it.sheet == fileObj.sheet && it.name == iExcel;
                                    });

                                    if (typeof item !== "undefined") {
                                        item.crc = miscUtils.getCrc32(fileObj.path);
                                        qryList.push(
                                            global.base.sqls.ApiApplyTables_insertAppDataVersion(global.const.appId, item.sheet, iFile.excel, item.version, global.utils.toDateTime(new Date()), item.json, item.crc)
                                        );
                                    }

                                }else {
                                    var itemName = fileObj.sheet;
                                    var itemCrc = miscUtils.getCrc32(fileObj.path);
                                    var itemVersion = fileObj.version || 0;

                                    // insert into new table;
                                    qryList.push(
                                        global.base.sqls.ApiApplyTables_insertAppDataFileVersion(global.const.appId, itemName, itemVersion, global.utils.toDateTime(new Date()), itemCrc)
                                    );

                                }

                                //var pos = global.utils.getArrayIndex(global.base.dataVersions, 'sheet', fileObj.sheet);
                                //var pos = -1;
                                //for (var i = 0; i < global.base.dataVersions.length; ++i) {
                                //    var it = global.base.dataVersions[i];
                                //    if (!it) continue;
                                //    if (it.sheet == fileObj.sheet && it.name == iExcel) {
                                //        pos = i;
                                //        break;
                                //    }
                                //}
                                //if (-1 != pos) {
                                //    var item = global.base.dataVersions[pos];
                                //    item.crc = miscUtils.getCrc32(fileObj.path);
                                //    qryList.push(
                                //        global.base.sqls.ApiApplyTables_insertAppDataVersion(global.const.appId, item.sheet, iFile.excel, item.version, global.utils.toDateTime(new Date()), item.json, item.crc)
                                //    );
                                //}
                            } else {
                                var idx = fileObj.path.lastIndexOf('/')+1;
                                var path = fileObj.path.substring(idx);
                                qryList.push(
                                    global.base.sqls.ApiApplyTables_insertVersionList(path, 0, global.utils.toDateTime(new Date()))
                                );
                            }
                            job.status[fileObj.sheet].message = 'success';
                            // after ftp, need to remove the file
                            //try { fs.unlinkSync(fileObj.path); } catch (ex) {}
                        });

                        callback(null);
                        job.status['DataGrp'] = { message : 'begin', total : 1, progress : 1 };
                    },
                    function (callback) {
                        global.base.systemDB.executeAdvTrans(qryList, callback);
                    },
                    function (callback) {
                        global.base.getVersionsFromDB(callback);
                    },
				], function(err){
                    if (err) {
                        if (job.status['DataGrp'])
                            job.status['DataGrp'].message = err.message;
                        global.warn(err.stack);
                    } else {
                        job.status['DataGrp'].message = 'complete';
                    }
                    setTimeout(function() {job.state = 3}, 5000);
                    global.debug('AppParser.ApiApplyTables Result. change');
                    cb(null, { result : 'success', jobId : job.id, file : iExcel});
				});
			});

            
		}else {
	        global.debug('AppParser.ApiApplyTables Result. success');
	        cb(null, { result : 'success', file : iExcel });			
		}
	}catch (ex) {
        global.warn('AppParser.ApiApplyTables. error:%s', ex.message);
        global.warn(ex.stack);
        cb(ex);		
	}
};

apis.ApiGetAsyncJobData = function(req, cb) {
    var protocol = req.body;
    try {
        var jobList = protocol.jobId.split(',');
        var jobs = [];

        for (var i = 0; i < jobList.length; ++i) {
            var job = global.base.jobList[jobList[i]];
            if (!job) {
                jobs.push({id: jobList[i], result: 'invalid'});
            } else {
                job.result = 'success';
                jobs.push(job);
            }
        }

        for (var i = 0; i < jobList.length; ++i) {
            var job = global.base.jobList[jobList[i]];
            if (job && job.state === 3) {
                delete global.base.jobList[jobList[i]];
            }
        }
        cb(null, jobs);
    } catch (ex) {
        global.warn('AppParser.ApiGetAsyncJobData. error:%s', ex.message);
        var jobs = [];
        for(var i =0; i < jobList.length; ++i) {
            jobs.push({id:jobList[i]});
        }
        cb(ex, jobs);
    }
};

apis.ApiGetServiceList = function(req, cb) {
    var protocol = req.body;
    try {
        var self = apis;

        var list = [];
        var redisCli = global.base.redis.system.get(global.const.CHANNEL_USAGE);
        redisCli.get(global.const.SERVICE_LIST_KEY, 60*1000, function(err,data) {
            if (err) {
                return cb(err);
            }
            for (var key in data) {
                list.push(data[key]);
            }
            cb(null, list);
        });
    } catch (ex) {
        global.warn('AppParser.ApiGetServiceList. error:%s', ex.message);
        cb(ex); 
    }
};

apis.ApiActionServiceReq = function(req, cb) {
    var self = apis;
    var body = req.body;
    try {
        var iAck = {result : 'success'};
        if (body.service == 'WA')
            throw new Error('no_permission');
        var iCmd = [body.action, 'process'];
        var service = body.service;
        if (body.idx) {
            service = service + '.' + body.idx.toString();
        }
        iCmd.push(service);

        var redisCli = global.base.redis.message.get('AppCmds');
        if (!redisCli) {
            return cb(new Error('redis client not found'));
        }
        redisCli.publish('AppCmds', JSON.stringify({action : body.action, body : iCmd.join(' ')}));
        redisCli.unsubscribe('AppCmds');
        global.debug('AppParser.ApiActionServiceReq Result. success.');
        cb(null, iAck);
    } catch (ex) {
        global.warn('AppParser.ApiActionServiceReq. error:%s', ex.message);
        cb(ex);
    }
};
