module.exports = {
    clearServicesFromDB : function() {
        return 'DELETE FROM `T_MON_SERVICE`';
    },
	insertServicesToDB : function(idx, service, hosts, pid, state, cpu, memory, rss, startDate, updateDate){
        return {
            sql : 'INSERT INTO T_MON_SERVICE SET ?',
            data : {
                idx : idx,
                service : service,
                hosts : hosts,
                pid : pid,
                state : state,
                cpu : cpu,
                memory : memory,
                rss : rss,
                startDate : startDate,
                updateDate : updateDate
            }
        }
	},
};