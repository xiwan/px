'use strict'
var apis = exports.apis = {};

apis.ApiConvertLocalization = function(req, res) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('ApiConvertLocalization');
}

apis.apiTest = function(req, res){
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end('xxxxxxxxxxx2');
}

apis.wbTest = function(protocol, cb){
	cb(null, { result : 'success'});
}