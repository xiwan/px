'use strict'

var mysql      = require('mysql');
var util       = require('util');
var xlsx       = require('xlsx');
var async      = require('async');
var __         = require('underscore');
var fs         = require('fs');

global.argv = require('optimist').argv;
global.argv.baseDir || (global.argv.baseDir = '../libs/schema');

var iDB = xlsx.readFile('../cfg/schema/systems.xlsx');
var sheet = iDB.Sheets['Database'];
var schemas = xlsx.utils.sheet_to_row_object_array(sheet);

async.eachSeries(schemas, initSchema, function(err) {
    err && console.warn('initSchema. error:%s', err.message);
    process.exit(0);
});

function initSchema(schema, callback) {
	try {
	    var connection = mysql.createConnection({
	        host     : global.argv.host || schema.Host,
	        user     : schema.User,
	        password : schema.Password,
	        database : schema.Name
	    });

	    var name = util.format('../cfg/schema/%s.xlsx', schema.Name);
	    var iFile = xlsx.readFile(name);
	    var tables = {};
        iFile.SheetNames.forEach(function(name) {
            var sheet = iFile.Sheets[name];
            tables[name] = xlsx.utils.sheet_to_row_object_array(sheet);
        });

        getTableList(connection, schema.Name, function(err, iList) {
        	if (err){
        		connection.end();
        		throw err;
        	}

            var domain = {};
            var iData = [], workList = [];
            var iDomains = tables.Domain;

            iDomains.forEach(function(iRef) {
                iData.push({
                    schema : schema.Name,
                    domain : domain,
                    iRef : iRef,
                    iList : iList,
                    tables : tables,
                    workList : workList
                })
            });
            
            async.mapSeries(iData, function(data, cb) { 
            	initTable(connection, data, cb) 
            }, function(err) {
            	console.warn('initSchema. name:%s', schema.Name);
                if (err) {
                    cb(err);
                    connection.end();
                    return;
                }
                saveDomain(schema, tables, function(err) {
                    callback(err);
                    connection.end();
                });
            });
        });

	}catch (ex) {
        console.warn('initSchema. error:%s', ex.message);
        cb(null);		
	}
}

function saveDomain(schema, data, cb) {
    var iDomain = data.Domain;
    var domains = {};

    iDomain.forEach(function(item) {
        var domain = domains[item.Domain] || (domains[item.Domain] = []);
        var row = {table : util.format("'%s'", item.TableName), name : util.format("'%s'", item.Name), key : '', cols : []};
        var table = data[item.TableName];
        table.forEach(function(col) {
            var name = util.format("'%s'", col.Name);
            if (col.Name)
                row.cols.push(name);
            col.IsKey || (col.IsKey = '');
            var isKey = util.format('%s', col.IsKey);
            if (isKey.toLowerCase() == 'true')
                row.key = name;
        });

        row.parent = item.Hierarchy ? util.format("'%s'", item.Hierarchy) : 'null';
        domain.push(row);
    });

    var baseDir = global.argv.baseDir;
    for(var key in domains) {
        var name = key;
        var iCtx = [];
        iCtx.push('{');
        iCtx.push(util.format('  var %s = exports.%s = function() {', name, name));
        iCtx.push('    this.tables = [];');
        var domain = domains[name];
        domain.forEach(function(item) {
            iCtx.push(util.format('    this.tables.push({ table : %s, name : %s, key : %s, parent : %s, cols : [%s] });', item.table, item.name, item.key, item.parent, item.cols.join(', ')));
        });
        iCtx.push('  };');
        iCtx.push('');
        iCtx.push(util.format('  %s.prototype.get = function() { return this.tables; }', name));
        iCtx.push('}');
        iCtx.push('');
        iCtx.push(util.format('exports.getDictionary = function () { return (new %s()).get(); };', name));

        var iName = schema.Name.split('_');
        try { fs.mkdirSync(baseDir); } catch (ex) {}
        var iDir = baseDir + '/' + iName[iName.length-1];
        try { fs.mkdirSync(iDir); } catch (ex) {}
        var iFile = iDir + '/' + name + '.js';
        fs.writeFileSync(iFile, iCtx.join('\n'), 'utf8');
        console.log('It\'s saved! %s', iFile);
    }

    cb(null);
}


function getTableList(connection, name, cb) {
    var qry = [];
    qry.push('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES');
    qry.push(util.format('WHERE TABLE_SCHEMA = "%s"', name));
    qry.push('  and TABLE_NAME <> "DataVersion"');
    connection.query(qry.join('\n'), function(err, rows) {
        if (err) {
            cb(err);
            return;
        }
        
        var iList = [];
        rows.forEach(function(row){
            iList.push({
                schema : name,
                name : row.TABLE_NAME.toUpperCase()
            });
        });

        var iAck = {};
        async.mapSeries(iList, function(data, cb){
        	getColumnList(connection, data, cb)
        }, function(err, results){
            results.forEach(function(result, idx) {
                iAck[iList[idx].name] = result.cols;
            });
            cb(null, iAck);
        });

    });
}

function getColumnList(connection, data, cb) {
	var qry = util.format('SHOW COLUMNS from %s from %s', data.name, data.schema);

	connection.query(qry, function(err, rows) {
        var iAck = {
            error : err,
            cols : []
        };
        if (!err) {
            rows.forEach(function(row) {
                iAck.cols[row.Field] = {
                    DataType : row.Type,
                    IsNull : row.Null === 'NO' ? 'NOT' : undefined,
                    IsKey : row.Key
                }
            });
        }
        cb(null, iAck);
	});
}

function initTable(connection, data, cb) {
    try {
        var name = data.iRef.TableName;
        if (__.indexOf(data.workList, name) >= 0) {
            cb(null);
            return;
        }
        data.workList.push(name);
        if (!data.iList[name]) {
            var qry = getCreateQry(data.schema, data.iRef, data.tables[name]);
            connection.query(qry, function(err) {
                if (err) {
                    console.error(qry);
                    console.error(err.message);
                    cb(null);
                    return;
                }
                console.log('create table %s.%s', data.schema, name);
                cb(null);
            });
        } else {
            var qryList = getAlterQry(data.schema, data.iRef, data.iList[name], data.tables[name]);
            if (qryList.length == 0) {
                cb(null);
                return;
            }
            async.map(qryList, function(qry, callback) {connection.query(qry, callback);}, function(err) {
                if (err) {
                    console.error(qryList);
                    console.error(err.message);
                    cb(null);
                    return;
                }
                console.log('alert table %s.%s', data.schema, name);
                cb(null);
            });
        }
    } catch (ex) {
        console.warn('initTable. %s.%s error:%s', data.schema, data.iRef.TableName, ex.code);
        console.log(ex.stack);
        cb(null, ex);
    }
}


function getCreateQry(schema, desc, obj) {
    var cols = [], key = [];
    obj.forEach(function(col) {
        if (col.Name) {
            cols.push(util.format('`%s` %s %s NULL %s %s COMMENT "%s"', col.Name, col.DataType, col.IsNull?'NOT':'', col.UQ?'UNIQUE':'', col.AI?'AUTO_INCREMENT' : '', col.Description));
            col.IsKey && key.push(util.format('`%s`', col.Name));
        }
    });
    var partition = '';
    if (desc.PartitionKey && desc.PartitionKey != '') {
        switch(desc.PartitionBy) {
            case 'LIST':
                partition = util.format('PARTITION BY LIST COLUMNS (`%s`) (PARTITION p1 VALUES IN (1))', desc.PartitionKey);
                break;
            case 'RANGE':
                partition = util.format('PARTITION BY RANGE (TO_DAYS(`%s`)) (PARTITION pMax VALUES LESS THAN (1))', desc.PartitionKey);
                break;
            default :
                partition = util.format('PARTITION BY HASH(`%s`) PARTITIONS %s', desc.PartitionKey, desc.PartitionNum);
                break;
        }
    }
    var primaryKey = key.length === 0 ? '' : util.format(',\n PRIMARY KEY (%s)', key.join(','));

    return util.format('CREATE TABLE `%s`.`%s` (\n  %s %s )\n  ENGINE = InnoDB\n %s', schema, desc.TableName, cols.join(',\n  '), primaryKey, partition);
}


function getAlterQry(schema, desc, ref, obj) {
    var qry = [];

    function isEqualDataType(t1, t2) {
        var numeric = ['bigint', 'smallint', 'tinyint', 'int'];
        var type = t1.split('(')[0].toLowerCase();
        if (__.indexOf(numeric, type) < 0) {
            return t1.toLowerCase().trim() === t2.toLowerCase().trim();
        } else {
            return type === t2.toLowerCase().trim();
        }
    }

    function isEqualNull(t1, t2) {
        t1 || (t1 = '');
        t2 || (t2 = '');

        return t1.toLowerCase().trim() === t2.toLowerCase().trim();
    }

    obj.forEach(function(col) {
        if (col.Name) {
            // 컬럼 데이터 형 수정..
            var iDef = ref[col.Name];
            if (iDef) {
                if (!isEqualDataType(iDef.DataType, col.DataType) || !isEqualNull(iDef.IsNull, col.IsNull)) {
                    qry.push(util.format('alter table `%s`.`%s` modify column `%s` %s %s NULL COMMENT "%s"', schema, desc.TableName, col.Name, col.DataType, col.IsNull?'NOT':'', col.Description));
                }
                delete ref[col.Name];
            } else {
                // 컬럼 추가..
                qry.push(util.format('alter table `%s`.`%s` add column `%s` %s %s NULL COMMENT "%s"', schema, desc.TableName, col.Name, col.DataType, col.IsNull?'NOT':'', col.Description));
            }
        }
    });

    return qry;
}

