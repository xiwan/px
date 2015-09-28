var util = require('util');

module.exports = {
	getVersionsFromDB : function(appId){
        var iQry = [];
        iQry.push('select x.sheet, x.category, y.version, y.json, y.crc, x.excel as name, y.date from T_APP_DATA x');
        iQry.push('join (select * from T_APP_DATA_VERSION) y');
        iQry.push('on (x.appId = y.appId and x.sheet = y.sheet and x.maxVersion = y.version)');
        iQry.push(util.format('where x.appId = "%s"', appId));
        return iQry.join(' ');
	},

	ApiApplyTables_instertAppData : function(appId, key, excel, category, version) {
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

	ApiApplyTables_updateAppData : function(version, appId, key) {
		return {
            sql : 'UPDATE T_APP_DATA SET maxVersion = ? where appId = ? and sheet = ?',
            data : [version, appId, key]
        }
	},

	ApiApplyTables_insertAppDataVersion : function(appId, sheet, version, date, json, crc) {
		return	{
            sql : 'INSERT INTO T_APP_DATA_VERSION SET ?',
            data : {
                appId : appId,
                sheet : sheet,
                version : version,
                date : date,
                json : json,
                crc : crc
            }
        }
	},
	
};