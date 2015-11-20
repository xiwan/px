var util = require('util');
var fs = require('fs');
var __ = require('underscore');
var async = require('async');
var sqlite= require('sqlite-wrapper');
var ftp = require('ftp');

function splitData(data, toLower) {
    var list = data.split(',');
    var out = [];
    for(var i=0; i<list.length;i++) {
        var item = list[i].trim().toString();
        if (item.length === 0 || item[0] === '#')
            continue;
        if (toLower)
            item = item.toLowerCase();
        out.push(item);
    }
    return out;
}

exports.loadExcel2Json = function(filePath, ignores) {
    try {
        var XLSX = require('xlsx');
        var XL = require('./xlsx_utils');
        var __ = require('underscore');
        var xlsx = XLSX.readFile(filePath);
        var tables = {};
        var zLen = xlsx.SheetNames.length;
        for(var z=0; z<zLen; z++) {
            var name = xlsx.SheetNames[z];
            if (name[0] === '#')
                continue;

            var sheet = xlsx.Sheets[name];

            var dataKey = {};
            try {
                var csv = XL.utils.sheet_to_csv(sheet).split('\n');
                var obj = XL.utils.sheet_to_row_object_array(sheet);
                if (!csv[2] || !csv[1])
                    continue;

                var iName = splitData(csv[3], false);
                var iDefs = splitData(csv[2], true);

                if (iName.length > iDefs.length || iName.length === 0) {
                    global.warn('loadExcel2Json. sheet:%s, iName[%d], iDefs[%d]', name, iName.length, iDefs.length);
                    continue;
                }
                var tmp = __.without(iDefs, 'string', 'long', 'int', 'byte', 'float', 'outstring');
                if ( tmp.length > 0 ) {
                    ignores.push({
                        sheet:name,
                        error: JSON.stringify(tmp)
                    });
                    global.warn('loadExcel2Json. sheet:%s, error:%s', name, JSON.stringify(tmp));
                    continue;
                }

                var iSheet = {
                    data : {},
                    cols : convertToColumns(csv[3], csv[2], csv[1]),
                    rows : 0
                };

                var iKey = iName[0].replace(/"/gi, '');
                var iType = iDefs[0].replace(/"/gi, '');
                var i = 0;
                for(var x in obj) {
                    if (i++ < 3) continue;
                    var row = obj[x];

                    var id = row[iKey];
                    if (id == 'EOF') {
                        break;
                    }
                    for(var r in row) {
                        if (r[0] === '#') delete row[r];
                    }

                    for(var k=0; k<iName.length; k++) {
                        var col = iName[k];
                        if (col[0] === '#') {
                            continue;
                        }
                        var def = iDefs[k];
                        var item = row[col];
                        if (typeof(item) === 'undefined') {
                            ignores.push({
                                sheet:name,
                                id : id,
                                col : col,
                                item : 'undefined'
                            });
                        } else if (def ==='int' || def === 'long' || def === 'byte') {
                            var item2 = item.toString();
                            if (parseInt(item) === null || item2.trim().length === 0) {
                                ignores.push({
                                    sheet:name,
                                    id : id,
                                    col : col,
                                    def : def,
                                    item : parseInt(item)
                                });
                                row[col] = parseFloat(item);
                                global.warn('loadExcel2Json. sheet:%s, id:%s, col:%s, value:%s, error:%s', name, id, col, item, typeof(item));
                            } else {
                                row[col] = Math.round(parseFloat(item));
                            }
                        } else if (def == 'float') {
                            var item2 = item.toString();
                            if (parseInt(item) === null || item2.trim().length === 0) {
                                ignores.push({
                                    sheet:name,
                                    id : id,
                                    col : col,
                                    def : def,
                                    item : parseFloat(item)
                                });
                                row[col] = parseFloat(item);
                                global.warn('loadExcel2Json. sheet:%s, id:%s, col:%s, value:%s, error:%s', name, id, col, item, typeof(item));
                            } else {
                                row[col] = parseFloat(item);
                            }
                        } else {
                            row[col] = util.format('%s', row[col]);
                        }
                    }

                    if (iType === 'int' || iType === 'byte'  || iType === 'long') {
                        id = parseInt(id);
                    }

                    var _id = util.format('%s', id).toUpperCase();
                    if (!dataKey[_id]) {
                        dataKey[_id] = true;
                        iSheet.data[id] = row;
                        iSheet.rows++;
                    }
                }
                tables[name] = iSheet;
            } catch (ex) {
                global.warn('loadExcel2Json. sheet:%s, error:%s', name, ex.toString());
                console.log(ex.stack);
            }
        }
        return tables;
    } catch(ex) {
        console.log(ex.stack)
        global.error('loadExcel2Json:%s', ex.toString());
        return null;
    }
};

exports.loadExcelToUid = function(filePath) {
    try {
        var XLSX = require('xlsx');
        var XL = require('./xlsx_utils');
        var xlsx = XLSX.readFile(filePath);
        var sheet = xlsx.Sheets[xlsx.SheetNames[0]];

        var csv = XL.utils.sheet_to_csv(sheet).split('\n');
        var cols = csv[0].split(',');
        var uidIdx = __.indexOf(cols, 'uid');
        var userNoIdx = __.indexOf(cols, 'userNo');
        var uidAry = [];

        for(var z = 1 ; z <= csv.length ; z++){
            if(csv[z] === undefined){
                continue;
            }

            if(csv[z].length === 0){
                continue;
            }

            var row = csv[z].split(',');
            var user = {
                uid : parseInt(row[uidIdx])
            };
            userNoIdx >= 0 && (user['userNo'] = row[userNoIdx]);

            uidAry.push(user);
        }

        return uidAry;
    } catch(ex) {
        global.error('loadExcelToUid:%s', ex.toString());
        return null;
    }
};


exports.readBinaryFile = function(filePath) {
    try {
        var fs = require('fs'),
            path = require('path');

        if (!fs.existsSync(filePath)) {
            return null;
        }
        return fs.readFileSync( filePath );
    } catch (ex) {
        global.warn('WS.readBinaryFile. error:%s', ex.message);
        return null;
    }
};

exports.generateCSFile = function(tables, target, iName) {
    var line = [];
    line.push('using System;');
    line.push('using System.Collections.Generic;');
    target === 1 ? line.push('using UnityEngine;') : line.push('using UDBase;');
    line.push('');
    line.push('namespace UD');
    line.push('{');
    for(var name in tables) {
        var cols = tables[name].cols;
        line.push('\t[Serializable]');
        line.push(util.format('\tpublic class %s', name));
        line.push('\t{');
        line.push('\t\tpublic BaseSQLite<Item> Tables = null;');
        if (target === 1) {
            line.push('\t\tpublic List<string> KeyList = new List<string>();');
            line.push('\t\tpublic List<Item> Map = new List<Item>();');
        } else {
            line.push('\t\tpublic Dictionary<string, Item> Map = new Dictionary<string, Item>();');
        }
        line.push('');
        line.push(util.format('\t\tpublic %s() {  }', name));
        line.push('');
        line.push(util.format('\t\tpublic %s(string path)', name));
        line.push('\t\t{');
        line.push(util.format('\t\t\tthis.Tables = new BaseSQLite<Item>(path+"/%s.db", "%s", "%s");', name, name, cols[0].name));
        line.push('\t\t}');
        line.push('');
        line.push(util.format('\t\tpublic %s(string path, int num, int version)', name));
        line.push('\t\t{');
        line.push(util.format('\t\t\tthis.Tables = new BaseSQLite<Item>(path+String.Format("DH_%s_{0}_{1}_db", num, version), "%s", "%s");', name, name, cols[0].name));
        line.push('\t\t\tthis.Map = this.Tables.Get();');
        line.push('\t\t}');
        line.push('');
        target === 1 && line.push('\t\t[Serializable]');
        line.push('\t\tpublic class Item');
        line.push('\t\t{');
        for(var i= 0,iLen=cols.length; i<iLen; i++) {
            var col = cols[i];
            if (col.out === 0 || col.out === 2) {
                var dataType = convetDataType(col.def, name, col.name, target);
                line.push(convertDataBody(dataType, col.name, target));
            }
        }
        line.push('\t\t}');
        line.push('\t}');
        line.push('');
    }

    line.push('\t[Serializable]');
    line.push(util.format('\tpublic class %s', iName));
    line.push('\t{');
    for(var name in tables) {
        line.push(util.format('\t\tpublic %s m_%s = null;', name, name));
    }
    line.push('');
    line.push(util.format('\t\tpublic %s(string path)', iName));
    line.push('\t\t{');
    for(var name in tables) {
        line.push(util.format('\t\t\tthis.m_%s = new %s(path);', name, name));
    }
    line.push('\t\t}');
    if (target === 2) {
        line.push('');
        line.push(util.format('\t\tpublic %s(string path, int iNum, Dictionary<string, int> iVersion)', iName));
        line.push('\t\t{');
        for(var name in tables) {
            line.push(util.format('\t\t\tthis.m_%s = new %s(path, iNum, iVersion["%s"]);', name, name, name));
        }
        line.push('\t\t}');
    }
    line.push('');
    line.push('\t\tpublic void terminate()');
    line.push('\t\t{');
    for(var name in tables) {
        line.push(util.format('\t\t\tthis.m_%s.Tables.close();', name));
    }
    line.push('\t\t}');
    line.push('');
    line.push(util.format('\t\tpublic %s()', iName));
    line.push('\t\t{');
    for(var name in tables) {
        line.push(util.format('\t\t\tthis.m_%s = new %s();', name, name));
    }
    line.push('\t\t}');
    line.push('\t}');
    line.push('}');
    line.push('');
    return line.join('\r\n');
};

exports.rmAllFiles = function(dirPath) {
    try { var files = fs.readdirSync(dirPath); }
    catch(e) { return; }
    if (files.length > 0)
        for (var i = 0; i < files.length; i++) {
            var filePath = dirPath + '/' + files[i];
            if (fs.statSync(filePath).isFile())
                fs.unlinkSync(filePath);
        }
};

exports.ftpUploadCombineReq = function(version, changeLog, job, fileName, cb) {
    try {
        job.state = 2;
        job.status = {};

        var iList = [], iSum = 0;
        global.base.dataVersions.forEach(function(item){
            var dbName = item.name.replace('.xlsx', '');
            var idx = __.indexOf(__.pluck(iList, 'sheet'), dbName) ;
            if ( idx > -1 ) {
                iList[idx].version += item.version;
            } else {
                iList.push({
                    category    : item.category,
                    sheet       : dbName,
                    version     : item.version
                });
            }
            iSum += item.version;
        });

        var idx = __.indexOf(__.pluck(iList, 'sheet'), fileName);
        var aName = util.format(global.base.rootPath + '/public/db/DH_%s_%d_%d_db', fileName, version, iList[idx].version);
        fs.existsSync(aName) && fs.unlinkSync(aName);

        var iMsg = {
            version : version,
            message : 'Create DB File',
            total : 0,
            progress : 0,
            error : 0
        };
        job.status[fileName] = iMsg;
        var aDB = sqlite(aName);

        async.mapSeries(changeLog, function(iLog, callback){

            var iMsg = {
                version : iLog.version,
                message : 'Create DB File',
                total : 0,
                progress : 0,
                error : 0
            };
            job.status[iLog.sheet] = iMsg;

            var iDef = {}, iNew = [], iDel = [];
            var bEnable = false;

            iLog.cols.forEach(function(col, idx) {
                if (!(col.out === 0 || col.out === 2)) {
                    iDel.push(col.name);
                    return;
                }
                var name = col.name;
                if (name.toLocaleLowerCase() === 'index') {
                    name += '2';
                    iNew.push({ old : col.name, now : name });
                }
                iDef[name] = {
                    type : convetSQLiteDataType(col.def, iLog.sheet, col.name),
                    unique : idx === 0 ? true : false
                };
                bEnable = true;
            });

            if (!bEnable) {
                iMsg.message = 'No Enable Columns';
                callback(null, null);
                return;
            } 

            var iData = JSON.parse(iLog.json);
            //console.log('iLog.sheet', iLog.sheet);
            var iRows = [];
            for(var key in iData.Tables) {
                var item = iData.Tables[key];
                iNew.forEach(function(iVal) {
                    item[iVal.now] = item[iVal.old];
                    delete item[iVal.old];
                });
                iDel.forEach(function(iVal) { delete item[iVal]; } );
                delete item['undefined'];
                if ( iLog.sheet == 'CHS' && !item['Text']) item['Text'] = ' ';
                iRows.push(item);
            }

            iMsg.total = iRows.length;
            iMsg.message = 'insert rows';

            var chunckSize = 10;
            var len = Math.ceil(iRows.length / chunckSize);
            var bigRows = [];
            for (var i = 0; i < len; i ++) {
                var subRow = iRows.slice(chunckSize * i, chunckSize * (i+1));
                bigRows.push(subRow);
            }
            // console.log('bigRows: ', bigRows)
            // console.log('iLog: ', iLog)
            // console.log('iDef: ', iDef)

            var iName = util.format(global.base.rootPath + '/public/db/DH_%s_%d_%d_db', iLog.sheet, version, iLog.version);
            fs.existsSync(iName) && fs.unlinkSync(iName);
            var iDB = sqlite(iName);
            async.parallel([
                function(callback) {
                    iDB.createTable(iLog.sheet, iDef, function(err){
                        if (err) {
                            iDB.close();
                            callback(err);
                            iMsg.message = err.message;
                            return;
                        }

                        async.eachSeries(bigRows, function(rows, cbk){
                            iDB.insertAll(iLog.sheet, rows, function(err){
                                iDB.close();
                                if (err){
                                    iDB = sqlite(iName);
                                    global.warn('iDB.createTable. name: %s, sheet:%s, rows:%s, error:%s', iName, iLog.sheet, rows.length, err.message);
                                    iMsg.error += rows.length;                                      
                                }else {
                                    iMsg.progress += rows.length;
                                }
                                cbk(err);
                            });
                        }, callback);

                    });
                },
                function(callback) {
                    aDB.createTable(iLog.sheet, iDef, function(err){
                        if (err) {
                            aDB.close();
                            callback(err);
                            iMsg.message = err.message;
                            return;
                        } 
                        async.eachSeries(bigRows, function(rows, cbk){
                            aDB.insertAll(iLog.sheet, rows, function(err){
                                // iMsg.progress += rows.length;
                                if (err){
                                    aDB.close();
                                    aDB = sqlite(aName);
                                    global.warn('aDB.createTable. name: %s, sheet:%s, rows:%s, error:%s', aName, iLog.sheet, rows.length, err.message);
                                    iMsg.error += rows.length;                                      
                                }else {
                                    iMsg.progress += rows.length;
                                }
                                cbk(err);
                            });
                        }, callback);
                    });
                }
            ], function(err, results){
                if (err) {
                    // iDB.close();
                    // aDB.close();
                    global.warn('zipAndWritFile. sheet:%s, error:%s', iLog.sheet, err.message);
                    callback(err);
                    return;
                }
                global.test(iName + " done!");
                iMsg.message = 'Finish DB';
                callback(err, {sheet: iLog.sheet, path: iName });
            });


        }, function(err, iFiles){
            if (err) {
                global.warn(err.stack);
                cb(err);
                return;
            }
            global.test(aName + " done!");
            iFiles = __.without(iFiles, null);
            var aFiles = [];
            aFiles.push({sheet: fileName, path: aName });

            var iName = util.format(global.base.rootPath + '/public/db/DH_VersionList_%d_%d', version, iSum);
            job.status['VersionList'] = {
                version : iSum,
                message : 'Make Version File',
                total : 0,
                progress : 0,
                error : 0
            };

            process.nextTick(function() {
                fs.writeFile(iName, JSON.stringify(iList), function(err) {
                    if (err) {
                        job.status['VersionList'].message = err.message;
                        cb(err);
                        return;
                    }
                    aFiles.push({ sheet : 'VersionList', path : iName });
                    cb && cb(null, iFiles);
                });
            });


        });

    } catch (ex) {
        cb(ex);
    }
}

/** generate sqlLiteDB and upload to ftp server. */
exports.ftpUploadReq = function(version, changeLog, job, cb) {
    try {
        job.state = 2;
        job.status = {};
        async.mapSeries(changeLog, function(item, cb) { zipAndWritFile(version, item, job, cb); }, function(err, iFiles) {
            if (err) {
                cb(err);
                return;
            }

            iFiles = __.without(iFiles, null);

            var iList = [], iSum = 0;
            global.base.dataVersions.forEach(function(item) {
                iList.push({
                    category : item.category,
                    sheet : item.sheet,
                    version : item.version
                });
                iSum += item.version;
            });

            var iName = util.format(global.base.rootPath + '/public/db/DH_VersionList_%d_%d', version, iSum);
            job.status['VersionList'] = {
                version : iSum,
                message : 'Make Version File',
                total : 0,
                progress : 0,
                error : 0
            };

            process.nextTick(function() {
                fs.writeFile(iName, JSON.stringify(iList), function (err) {
                    if (err) {
                        job.status['VersionList'].message = err.message;
                        cb(err);
                        return;
                    }
                    iFiles.push({ sheet : 'VersionList', path : iName });
                    // var client = new ftp();
                    // client.on('ready', function() {
                    //     global.debug('ftpUploadReq. onReady');
                    //     client.binary(function(err) {
                    //         if (err) {
                    //             cb(err);
                    //             job.status['VersionList'].message = err.message;
                    //             client.end();
                    //             return;
                    //         }
                    //         global.debug('ftpUploadReq.binary');
                    //         async.eachSeries(iFiles, function(fileObj, cb) {
                    //             setTimeout(function() {
                    //                 var fileName = fileObj.path.substring(5);
                    //                 var target = 'EveryFun/HeartOfDragon/GameTable/' + fileName;
                    //                 async.waterfall([
                    //                     function(callback) { client.put(fileObj.path, target, callback); },
                    //                     function(callback) { client.size(target, callback); }
                    //                 ], function(err, size) {
                    //                     var result = err ? err.message : 'success';
                    //                     job.status[fileObj.sheet].message = 'ftp result : ' + result;
                    //                     global.debug('ftpUploadReq.binary. name:%s, result:%s(%s)', fileName, result, size);
                    //                     cb(err);
                    //                 });
                    //             }, 300);
                    //         }, function(err) {
                    //             if (err) {
                    //                 cb(err);
                    //                 client.end();
                    //                 return;
                    //             }
                    //             global.debug('ftpUploadReq.put');
                    //             client.end();
                    //         })
                    //     })
                    // });
                    // client.on('end', function() {
                    //     global.debug('ftpUploadReq.end');
                    //     cb && cb(null, iFiles);
                    // });
                    // client.on('error', function(err) {
                    //     global.warn('ftpUploadReq. error:%s', err.message);
                    //     job.status['VersionList'].message = err.message;
                    //     cb && cb(err);
                    // });
                    // client.connect(global.base.ftpConfig);
                    cb && cb(null, iFiles);
                });
            });
        });
    } catch (ex) {
        cb(ex);
    }
};

/** confirm file to ftp server. */
exports.ftpVersionChkReq = function(data, version, cb) {
    try {

        var client = new ftp();
        var target = 'EveryFun/HeartOfDragon/GameTable/';

        async.mapSeries(data, function(item, cb){

            var fileName = util.format('DH_%s_%s_%s_db', item.sheet, version, item.version);

            client.size(target + fileName, function(err, size) {

                size = (size === undefined) ? 0 : size

                cb(null, {
                    target : item.sheet,
                    size : size
                })
            });

        }, function(err, results){
            console.dir(results);
            cb(null, results);
        });

        client.on('end', function() {
            global.debug('ftpVersionChkReq .end');
            cb(null, iFiles);
        });

        client.on('error', function(err) {
            global.warn('ftpVersionChkReq. error:%s', err.message);
            cb(err);
        });

        client.connect(global.base.ftpConfig);

    } catch (ex) {
        cb(ex);
    }
};


exports.mrgMaintenance = function(protocol, cb) {
    try {
        //var execute = ['upload'];
        var chkState = { 0 : 'open', 1 : 'close'};

        /*
        var pos = execute.indexOf(protocol.execute);
        if (pos < 0){
            throw new Error('protocol.execute error');
        };
        */
        if (typeof(chkState[protocol.maintenance]) !== 'string'){
            throw new Error('protocol.maintenance error');
        }

        var ftp = require('ftp');
        var client = new ftp();

        var file = {
            Maintenance : parseInt(protocol.maintenance),
            Title: protocol.title,
            Desc: protocol.desc.replace('\n','\n\r'),
            ImgUrl: protocol.imgUrl,
            BoardUrl: protocol.boardUrl
        };

        fs.writeFile('/tmp/Maintenance.txt', JSON.stringify(file), function(err){
            err && cb(err);
            if(err) return;

            client.on('ready', function(){
                client.put('/tmp/Maintenance.txt', 'EveryFun/HeartOfDragon/Maintenance.txt', function(err){
                    err && cb(err);
                    if(err) return;

                    client.end();
                });
            });

            client.on('end', function() {
                console.log('ftpUploadReq.end');
                cb(null);
            });
            client.on('error', function(err) {
                console.log('ftpUploadReq. error:%s', err.message);
                cb(err);
            });
            client.connect(global.base.ftpConfig);
        });

    } catch(ex){
        cb(eX);
    }
};




/** */
function zipAndWritFile(version, iLog, job, cb) {
    try {
        var iName = util.format(global.base.rootPath + '/public/db/DH_%s_%d_%d_db', iLog.sheet, version, iLog.version);
        fs.existsSync(iName) && fs.unlinkSync(iName);

        var iMsg = {
            version : iLog.version,
            message : 'Create DB File',
            total : 0,
            progress : 0,
            error : 0
        };
        job.status[iLog.sheet] = iMsg;
        var iDB = sqlite(iName);
        var iDef = {}, iNew = [], iDel = [];
        var bEnable = false;
        iLog.cols.forEach(function(col, idx) {
            if (!(col.out === 0 || col.out === 2)) {
                iDel.push(col.name);
                return;
            }
            var name = col.name;
            if (name.toLocaleLowerCase() === 'index') {
                name += '2';
                iNew.push({ old : col.name, now : name });
            }
            iDef[name] = {
                type : convetSQLiteDataType(col.def, iLog.sheet, col.name),
                unique : idx === 0 ? true : false
            };
            bEnable = true;
        });

        if (!bEnable) {
            iMsg.message = 'No Enable Columns';
            cb(null, null);
            return;
        }

        iDB.createTable(iLog.sheet, iDef, function(err) {
            if (err) {
                iDB.close();
                cb(err);
                iMsg.message = err.message;
                return;
            }

            var iData = JSON.parse(iLog.json);
            var iRows = [];
            for(var key in iData.Tables) {
                var item = iData.Tables[key];
                iNew.forEach(function(iVal) {
                    item[iVal.now] = item[iVal.old];
                    delete item[iVal.old];
                });
                iDel.forEach(function(iVal) { delete item[iVal]; } );
                delete item['undefined'];
                iRows.push(item);
            }
            iMsg.total = iRows.length;
            iMsg.message = 'insert rows';
            
            async.eachSeries(iRows, function(row, callback) {
                iDB.insert(iLog.sheet, row, function(err) {
                    iMsg.progress++;
                    iDB.close();
                    iDB = sqlite(iName);
                    if (err) {
                        global.warn('zipAndWritFile. sheet:%s, row:%s, error:%s', iLog.sheet, JSON.stringify(row), err.message);
                        iMsg.error++;
                    }
                    callback(null);
                });
            }, function(err) {
                err && global.warn('zipAndWritFile. sheet:%s, error:%s', iLog.sheet, err.message);
                iMsg.message = 'Finish DB';
                cb(err, {sheet: iLog.sheet, path: iName });
            });
        });
    } catch (ex) {
        cb(ex);
    }
}

function convertToColumns(names, defs, out) {
    names = names.split(',');
    defs = defs.split(',');
    out = out.split(',');
    var cols = [];
    for(var i= 0, iLen=names.length; i<iLen; i++) {
        if (names[i][0] === '#')
            continue;
        cols.push({
            name : names[i],
            def : defs[i],
            out : parseInt(out[i])
        });
    }
    return cols;
}

function convetDataType(dataType, sheet, name, target) {
    switch(dataType.toLowerCase()) {
        case 'byte':
            return 'int';
        case 'int':
            return 'int';
        case 'long':
            return target === 1 ? 'Outlong' : 'long';
        case 'float':
            return 'double';
        case 'string':
            return 'string';
        case 'outstring':
        case 'out_string':
            return target === 1 ? 'OutString' : 'string';
        default:
            global.warn('convetDataType unsupported data sheet:%s, name:%s, type:%s', sheet, name, dataType);
            return 'string';
    }
}

function convertDataBody(dataType, name, target) {
    if (dataType === 'OutString' || dataType === 'string')
        return util.format('\t\t\tpublic %s %s;', dataType, name);

    var iList = [];
    if (target === 1) {
        iList.push('\t\t\t[SerializeField]');
        iList.push(util.format('\t\t\tprotected %s _%s;', dataType, name));
        iList.push(util.format('\t\t\tpublic %s %s { get { return _%s + NetData.TableRandomValue; } set {_%s = value - NetData.TableRandomValue;}}', dataType, name, name, name));
    } else {
        iList.push(util.format('\t\t\tpublic %s %s;', dataType, name));
    }
    return iList.join('\n');
}

function convetSQLiteDataType(dataType, sheet, name) {
    switch(dataType.toLowerCase()) {
        case 'byte':
        case 'int':
        case 'long':
            return 'INTEGER';
        case 'float':
            return 'REAL';
        case 'outstring':
        case 'string':
        case 'out_string':
            return 'TEXT';
        default:
            global.warn('convetSQLiteDataType unsupported data sheet:%s, name:%s, type:%s', sheet, name, dataType);
            return 'TEXT';
    }
}
