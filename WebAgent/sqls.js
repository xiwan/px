var util = require('util');

module.exports = {
	getVersionsFromDB : function(appId){
        var iQry = [];
        iQry.push('select x.sheet, x.category, y.version, y.json, y.crc, x.excel as name, y.date from T_APP_DATA x');
        iQry.push('join (select * from T_APP_DATA_VERSION) y');
        iQry.push('on (x.appId = y.appId and x.sheet = y.sheet and x.maxVersion = y.version and x.excel = y.excel)');
        iQry.push(util.format('where x.appId = "%s"', appId));
        return iQry.join(' ');
	},

    getFileVersionFromDB : function(appId) {
        return 'SELECT sheet, version, crc FROM (select * FROM T_APP_DATA_FILE_VERSION ORDER BY version desc) AS temp GROUP BY sheet;';
    },

	ApiApplyTables_insertAppData : function(appId, key, excel, category, version) {
		return {
            sql : 'INSERT INTO T_APP_DATA SET ?',
            data : {
                appId : appId,
                sheet : key,
                excel : excel,
                category : category,
                maxVersion : version
            }
        }
	},

	ApiApplyTables_updateAppData : function(version, appId, sheetKey, excelKey) {
		return {
            sql : 'UPDATE T_APP_DATA SET maxVersion = ? where appId = ? and sheet = ? and excel = ?',
            data : [version, appId, sheetKey, excelKey]
        }
	},

	ApiApplyTables_insertAppDataVersion : function(appId, sheet, excel, version, date, json, crc) {
		return	{
            sql : 'INSERT INTO T_APP_DATA_VERSION SET ?',
            data : {
                appId : appId,
                sheet : sheet,
                excel : excel,
                version : version,
                date : date,
                json : json,
                crc : crc
            }
        }
	},

    ApiApplyTables_insertAppDataFileVersion : function(appId, sheet, version, date, crc) {
        return	{
            sql : 'INSERT INTO T_APP_DATA_FILE_VERSION SET ?',
            data : {
                appId : appId,
                sheet : sheet,
                version : version,
                date : date,
                crc : crc
            }
        }
    },

    ApiApplyTables_insertVersionList : function(path, uid, date) {
        return {
            sql : 'INSERT INTO T_APP_DATA_VERSION_LIST SET ?',
            data : {
                path : path,
                uid : uid,
                date : date,
            }
        };
    },

    ApiDeploy_getServiceMachineList : function() {
        return ['SELECT * FROM T_MSG_HOST ORDER BY groupId'];
    },

    ApiDeploy_getServiceDeployItem : function() {
        return ['select version, state, uploadDate, patchNote, writer, hosts, applyDate, groupId from T_SERVICE_DEPLOYS where state != 9 order by version desc'];
    },

    ApiDeploy_getServiceDeployItemMaxVer : function(date) {
        return [util.format('select max(version) as version from T_SERVICE_DEPLOYS where state != 9 and uploadDate > "%s"', date)];
    },

    ApiDeploy_insertServiceDeployItem : function(cols, vals) {
        return [util.format('insert into T_SERVICE_DEPLOYS (%s) values (%s)', cols.join(', '), vals.join(', '))];
    },

    ApiDeploy_updateServiceDeployItem : function(state, groupId, version) {
        if (state == 3) {
            return [util.format('update T_SERVICE_DEPLOYS set state = %s, groupId = %s, applyDate = "%s" where version = %s', state, groupId, global.utils.toMySQLDate(new Date()), version)];
        } else {
            return [util.format('update T_SERVICE_DEPLOYS set state = %s, groupId = %s where version = %s', state, groupId, version)];
        }
    },

    ApiDeploy_updateAppData : function(version, service) {
        return [util.format('update T_APP_BASE set deployVersion = %s where service = "%s"', version, service)];
    },

    ApiDeploy_delServiceDeployItem : function(version) {
        return [util.format('delete from T_SERVICE_DEPLOYS where version = %s', version)];
    },
};