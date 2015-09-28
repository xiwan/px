
var apis = exports.apis = {};

apis.dpiTest = function(req, res){
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('xxxxxxxxxxx2');
}

apis.wbTest = function(protocol, cb){
	cb(null, { result : 'success'});
}

// apis.ApiFileUploadReq = function(){};