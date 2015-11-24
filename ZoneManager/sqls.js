var util = require('util');

module.exports = {
	getServerZoneList : function() {
		return ['select * from T_SERVER_ZONE order by groupId'];
	},
	getServerByGroupId : function(groupId) {
		return [util.format('select * from T_SERVER_ZONE where groupId = %s', groupId)];
	},
};