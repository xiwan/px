/*
function splitData(data) {
    var list = data.split(',');
    var out = [];
    for(var i=0; i<list.length;i++) {
        var item = list[i].trim().toString();
        out.push(item);
    }
    return out;
}
*/

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


exports.readLocalizationFile = function(localization) {
    try {
        var XLSX = require('xlsx');
        var XL = require('./xlsx_utils');
        var __ = require('underscore');

        var xlsx = XLSX.readFile(localization);
        var sheet = xlsx.Sheets['CHS'];
        var obj = XL.utils.sheet_to_row_object_array(sheet);

        var tables = {};
        var i = 0;
        for(var x in obj) {
            if (i++ < 2) continue;
            var row = obj[x];

            var id = row['Index'];
            if (id == 'EOF') {
                break;
            }

            tables[id] = {
                before :  row['Text'],
                after : '',
                dirtyFlag : 'Deleted'
            }
        }
        return tables;
    } catch (ex) {
        global.warn('app_langs.readLocalizationFile. error:%s', ex.message);
        throw ex;
    }
};                                                               ''

exports.convertToLocalization = function(table, datas) {
    try {
        var XLSX = require('xlsx');
        var XL = require('./xlsx_utils');
        var __ = require('underscore');
        var xlsx = XLSX.readFile(table);

        var zLen = xlsx.SheetNames.length;
        for(var z=0; z<zLen; z++) {
            var name = xlsx.SheetNames[z];
            var sheet = xlsx.Sheets[name];
            var csv = XL.utils.sheet_to_csv(sheet).split('\n');
            var obj = XL.utils.sheet_to_row_object_array(sheet);

            var iDefs = splitData(csv[1], false);
            var iName = splitData(csv[2], false);

            var langs = [];
            iDefs.forEach(function(def, idx) {
                if (def.toLowerCase() === 'outstring') {
                    console.log('name : %s, idx:%s, name:%s', name, idx, iName[idx]);
                    langs.push({
                        key : iName[idx],
                        value : '#' + iName[idx]
                    });
                }
            });

            if ( langs.length === 0)
                continue;

            var iKey = iName[0].replace(/"/gi, '');

            var i = 0;
            for(var x in obj) {
                if (i++ < 2) continue;
                var row = obj[x];

                var id = row[iKey];
                if (!id || id == 'EOF') {
                    break;
                }

                langs.forEach(function(item) {
                    try {
                        var key = row[item.key];
                        var value = row[item.value];
                        if (key.toString() == '0') {
                            datas[name + '_' + item.key + '_' + id] = {
                                dirtyFlag : 'Delete',
                                after : '',
                                before : value
                            }
                        } else if (datas[key]) {
                            datas[key].after = value;
                            if (datas[key].before === value) {
                                datas[key].dirtyFlag = 'None';
                            } else {
                                datas[key].dirtyFlag = 'Update';
                            }
                        } else {
                            datas[key] = {
                                dirtyFlag : 'Create',
                                after : value,
                                before : value
                            }
                        }
                    } catch (ex) {
                        console.log('id:%s, item:%s', id, JSON.stringify(item));
                    }
                });
            }
        }
        return datas;
    } catch(ex) {
        global.warn('app_langs.convertToLocalization. error:%s', ex.message);
        throw ex;
    }
};


/** ���� ���� �����͸� array�� ��Ī���� ������.
 *  1. outstring ���� ������.
 *  2. outstring�� �÷� �̸��� value�� �÷��̸��� ���ƾ��Ѵ�. (value�� #�� �տ� ����)
 *  3. key�� 0 �̰ų� value�� 0 �� �÷��� �����Ѵ�.
 * */
exports.convertObjToExcelFile = function(parameter, cb) {
    try {
        var XLSX = require('xlsx');
        var XL = require('./xlsx_utils');
        var async = require('async');

        var xlsx = XLSX.readFile(parameter.filePath);

        var outSheetData = [];
        if(parameter.excelType === 'language'){ // ũ�Ⱑ Ŀ�� ������ ��Ʈ�� ���ü� �ְ� �Ͽ���.
            var isGetName = false;
            xlsx.SheetNames.forEach(function(name){
                if(name === parameter.country){ // ������ �ش�Ǵ� ��Ʈ�� array�� ����� (#�� ��¥�� �Ȱɸ�)
                    isGetName = true;

                    var para = {
                        xlsx : xlsx,
                        XL : XL,
                        name : parameter.country,
                        type : parameter.excelType
                    };
                    getExcelObj(para, outSheetData, function(err){
                        err && cb(err);
                        if(err) return;

                        cb(null, outSheetData);
                    });
                };
            });

            if(isGetName === false){
                return cb(new Error('not_found_sheetName'));
            };

        } else{ // Localization ���� ������ ������ ���ϵ�.
            async.eachSeries(xlsx.SheetNames, function(sheetName, callback) {
                if (sheetName[0] === '#'){
                    return callback(null);
                };
                var para = {
                    xlsx : xlsx,
                    XL : XL,
                    name :sheetName,
                    type : parameter.excelType
                };
                getExcelObj(para, outSheetData, callback);

            }, function(err){
                err && cb(err);
                if(err) return;

                cb(null, outSheetData);
            });
        };
    } catch(ex) {
        global.warn('app_langs.convertObjToExcelFile. error:%s', ex.message);
        cb(ex);
    }
};

/** ���� ���� ��ȯ. */
function getExcelObj(parameter, outSheetData, cb){
    var XL = parameter.XL;
    var name = parameter.name;

    var sheet = parameter.xlsx.Sheets[name];

    var csv = XL.utils.sheet_to_csv(sheet).split('\n');
    var obj = XL.utils.sheet_to_row_object_array(sheet);

    if(csv[0] === ''){
        global.warn('getExcelObj not_found_EOF');
        return cb(null);
    };

    var iColName = splitData(csv[3], false);
    var iDefs = splitData(csv[2], true);

    if (iColName.length !== iDefs.length || iColName.length === 0) {
        global.warn('getExcelObj. sheet:%s, iName[%d], iDefs[%d]', name, iColName.length, iDefs.length);
        return cb(new Error('convertObjToExcelFile fail.'));
    };


    var iOutstrColumns = [];
    if(parameter.type !== 'language'){
        iDefs.forEach(function(def, idx) {
            if (def.toLowerCase() === 'outstring') {
                iOutstrColumns.push({
                    key : iColName[idx],
                    value : '#' + iColName[idx]
                });
            }
        });
    } else{
        iOutstrColumns.push({
            key : iColName[0],
            value : iColName[1]
        });
    };


    if (iOutstrColumns.length === 0)
        return cb(null);

    var iKey = iColName[0].replace(/"/gi, ''); // ù ��° ��.

    var i = 0;
    var objDuplicate = {}; // 중복 검사를 위해 필요.
    for(var x in obj) {
        if (i++ < 3) continue;
        var row = obj[x];

        var id = row[iKey];
        if (!id || id == 'EOF') {
            break;
        }

        iOutstrColumns.forEach(function(item) {
            if(row[item.key] == 0 || row[item.value] == 0) // value ���� 0�̸� ��� ������Ʈ ��. �׷��� ����.
                return;

            if(!objDuplicate[row[item.key].toUpperCase()]){
                var obj = {
                    key : row[item.key],
                    value: row[item.value]
                }
                outSheetData.push(obj);
                objDuplicate[row[item.key].toUpperCase()] = obj;
            };
        });
    };

    cb(null);
};




exports.exportExcelBinary = function(datas) {
    try {
        var xlsx = require('node-xlsx');
        var fs = require('fs');

        var sheets = {worksheets: [
            {"name":"CHS", "data":[['Index', 'Text']]},
            {"name":"Create", "data":[['Index', 'Text']]},
            {"name":"Update", "data":[['Index', 'Before', 'After']]},
            {"name":"Delete", "data":[['Index', 'Text']]}
        ]};
        for(var key in datas) {
            var data = datas[key];
            switch(data.dirtyFlag) {
                case 'None':
                    if (data.after)
                        sheets.worksheets[0].data.push([key, data.after]);
                    break;
                case 'Create':
                    if(data.after) {
                        sheets.worksheets[0].data.push([key, data.after]);
                        sheets.worksheets[1].data.push([key, data.after]);
                    }
                    break;
                case 'Update':
                    if (data.after)
                        sheets.worksheets[0].data.push([key, data.after]);
                    if (data.before && data.after)
                        sheets.worksheets[2].data.push([key, data.before, data.after]);
                    break;
                case 'Delete':
                    if (data.after)
                        sheets.worksheets[0].data.push([key, data.after]);
                    if (data.before)
                        sheets.worksheets[3].data.push([key, data.before]);
                    break;
            }
        }
        return xlsx.build(sheets);
    } catch(ex) {
        global.warn('app_langs.exportExcelBinary. error:%s', ex.message);
        throw ex;
    }
};


/** ���� ���Ϸ� ��ȯ */
exports.makeExcelFile = function(pLangData, pCountry, cb) {
    try {

        //*
        var csv = [];
        csv.push('�ε��� �ڵ�, �ؽ�Ʈ\r\n');
        csv.push('2, 2\r\n');
        csv.push('string, string\r\n');
        csv.push('Index, Text\r\n');

        var count=0;
        for(var key in pLangData){
            var item = pLangData[key];
            csv.push('"'+item.msgID.replace('"','""')+'",'+'"'+ item[pCountry].replace('"','""')+'"\r\n');
            count++;
        };


        cb(null, csv.join(''));
        //*/

    } catch(ex) {
        global.warn('app_langs.exportExcelBinary. error:%s', ex.message);
        throw ex;
    };
};
