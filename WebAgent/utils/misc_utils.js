var util = require('util');
var fs = require('fs');
var __ = require('underscore');
var async = require('async');
var crc = require('../../libs/crc');

function getJSON (name) {
    if (name.length === 0)
        return null;

    var idx = global.utils.getArrayIndex(global.base.uploads, 'name', name);
    if (idx < 0)
        return null;

    return global.base.uploads[idx].json;
};

exports.getApplyFile = function(body) {
    var iList = [getJSON(body.excel), getJSON(body.language), getJSON(body.event)];
    var excelFile = [body.excel, body.language, body.event];
    var nameList = ['excel', 'language', 'event'];
    for(var i= 0, iLen=iList.length; i<iLen; i++) {
        if (iList[i])
            return {
                data : iList[i],
                excel : excelFile[i],
                category : nameList[i]
            }
    }
    throw new Error('invalid_parameter');
};

exports.getCrc32 = function(path){
    var buf = fs.readFileSync(path);
    var crcVal = crc.buffer.crc32(buf);
    return crcVal;
};