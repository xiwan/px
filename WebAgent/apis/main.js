'use strict'

var fs = require('fs');
var async = require('async');
var util = require('util');
var __ = require('lodash');
var crc = require('../../libs/crc');
var langUtils = require('../utils/lang_utils');
var appUtils = require('../utils/app_utils');
var miscUtils = require('../utils/misc_utils');

var apis = exports.apis = {};

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

apis.ApiApplyTables = function(req, cb) {
	var self = apis;
	global.debug('AppParser.ApiApplyTables Call.');
	try {
        var body = req.body;
        var iNum = parseInt(body.num);
        var iFile = miscUtils.getApplyFile(body);
        var keys = Object.keys(iFile.data);
        var qryList = [], changeLog = [];
        keys.forEach(function(key) {
            var sheet = iFile.data[key];
            var pos = global.utils.getArrayIndex(global.base.dataVersions, 'sheet', key);
            var base64 = new Buffer(JSON.stringify(sheet)).toString('base64');
            var version = 0;
            if (pos < 0) {
                global.base.dataVersions.push({
                    sheet : key,
                    category : iFile.category,
                    version : 1,
                    json : base64,
                    crc : 0,
                });
                version = 1;
                qryList.push(
                    global.base.sqls.ApiApplyTables_instertAppData(global.const.appId, key, iFile.excel, iFile.category, version)
                );
            } else {
                var item = global.base.dataVersions[pos];
                if (item.json !== base64) {
                    item.version++;
                    item.json = base64;
                    version = item.version;
                    qryList.push(
                        global.base.sqls.ApiApplyTables_updateAppData(item.version, global.const.appId, key)
                    );
                }
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
			process.nextTick(function() {
				async.waterfall([
					function (callback) { appUtils.ftpUploadReq(iNum, changeLog, job, callback); },
                    function (iFiles, callback) {
                        iFiles.forEach(function(fileObj){
                            if(fileObj.sheet !== 'VersionList'){
                                var pos = global.utils.getArrayIndex(global.base.dataVersions, 'sheet', fileObj.sheet);
                                var item = global.base.dataVersions[pos];
                                item.crc = miscUtils.getCrc32(fileObj.path);
                                qryList.push(
                                    global.base.sqls.ApiApplyTables_insertAppDataVersion(global.const.appId, item.sheet, item.version, global.utils.toDateTime(new Date()), item.json, item.crc)
                                );
                            }
                            job.status[fileObj.sheet].message = 'success';
                            //try { fs.unlinkSync(fileObj.path); } catch (ex) {}
                        });
                        callback(null);
                        job.status['DataGrp'] = { message : 'begin', total : 1, progress : 1 };
                    },
                    function (callback) { 
                        global.base.systemDB.executeAdvTrans(qryList, callback);
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
				});
			});

			cb(null, { result : 'success', jobId : job.id });
		}else {
	        global.debug('AppParser.ApiApplyTables Result. success');
	        cb(null, { result : 'success' });			
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
        var job = global.base.jobList[protocol.jobId];
        if (!job) throw new Error('invalid_job_id');
        job.result = 'success';
        cb(null, job);
        if (job.state === 3) {
            delete global.base.jobList[protocol.jobId];
        }
    } catch (ex) {
        global.warn('AppParser.ApiGetAsyncJobData. error:%s', ex.message);
        cb(ex);
    }
};

function apiDetector() {
    fs.readdir(__dirname, function(err, files) {
        if (err) return;
        files.forEach(function(f) {
            if (f != 'main.js'){
                var __apis = require('./' + f.replace('.js', '')).apis;
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
}
apiDetector();
