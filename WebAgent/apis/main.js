'use strict'

var fs = require('fs');

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
}

apis.dpiTest = function(req, res){
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('xxxxxxxxxxx2');
}

apis.wbTest = function(protocol, cb){
	cb(null, { result : 'success'});
}