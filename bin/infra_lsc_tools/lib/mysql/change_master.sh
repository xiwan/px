#!/bin/bash
#
#    (C) 2005-2013 PPStream Inc.
#
#        FUNCTION USE IN SOME SCRIPT
#    Use in game_install.sh, game_attch_ins.sh.
#   
#    Authors:  
#    lushichao 2012-12-11 <lushichao@qiyi.com> 
#
#    Last update:
#    lushichao 2013-09-02

PATH=${PATH}:/usr/local/mysql/bin:/usr/mysql/bin:/sbin
export PATH


# ----------------------------------------------------------------------------------------
# 确认db实例所属主库并指向它.
# ----------------------------------------------------------------------------------------
function change_master() {
    if [ "${MASTER_SLAVE}" -ge "2" ]; then
        if [ "${PRO_TYPE}" == "game" -a "${AUTO_DEPLOY}" == "1" ]; then
            # 配合自动化部署平台同时安装主库和从库的策略. 
            local i=0
            echo "[INFO] Geting master db info ..."
            while true
            do
                master_ip_port=`mysql -h ${MYDB_IP} -u ${MYDB_USR} -p${MYDB_PWD} -P ${MYDB_PORT} -N -s -e \
                    "SELECT concat(a.ip, '_', a.port) FROM main.gamedb_list a 
                     WHERE a.pro_name = '${PRO_NAME}' AND a.platid = ${PLAT_ID} AND a.channel='${CHANNEL}'
                       AND a.server_id = '${SERVER_ID}' AND a.master_slave = 1;"` \
                || { save_log ${FUNCNAME}  "error" "Fail to run sql: SELECT a.ip FROM main.gamedb_list ..."; global_finalize 5;}

                if [ "${master_ip_port}" != "" ]; then
                    break
                fi
                sleep 10
                i=$(($i + 10))
                if [ "$i" -gt "900" ]; then
                    save_log ${FUNCNAME} "error" "Can't find master db."; global_finalize 13
                fi
            done
        elif [ "${PRO_TYPE}" == "game" ]; then
            master_ip_port=`mysql -h ${MYDB_IP} -u ${MYDB_USR} -p${MYDB_PWD} -P ${MYDB_PORT} -N -s -e \
                "SELECT concat(a.ip, '_', a.port) FROM main.gamedb_list a 
                 WHERE a.pro_name = '${PRO_NAME}' AND a.platid = ${PLAT_ID} AND a.channel='${CHANNEL}'
                   AND a.server_id = '${SERVER_ID}' AND a.master_slave = 1;"` \
            || { save_log ${FUNCNAME}  "error" "Fail to run sql: SELECT a.ip FROM main.gamedb_list ..."; global_finalize 5;}
        elif [ "${PRO_TYPE}" == "plat" ]; then
            master_ip_port=`mysql -h ${MYDB_IP} -u ${MYDB_USR} -p${MYDB_PWD} -P ${MYDB_PORT} -N -s -e \
                "SELECT concat(a.ip, '_', a.port) FROM main.platdb_list a 
                 WHERE a.pro_name = '${PRO_NAME}' AND a.master_slave = 1;"` \
            || { save_log ${FUNCNAME} "error" "Fail to run sql: SELECT a.ip FROM main.platdb_list ..."; global_finalize 5;}
        fi

        master_ip=`echo ${master_ip_port} | cut -d '_' -f 1`
        master_port=`echo ${master_ip_port} | cut -d '_' -f 2`

        mysql -uroot -S /tmp/mysql.sock${SOCKNUM} -e \
            "change master to master_host='${master_ip}', master_user='dbrep', master_password='Ahgqr-wEjWZL', master_port=${master_port}; start slave;" \
        || { save_log ${FUNCNAME} "error" "Fail to run sql: change master to master_host='${master_ip}', \
            master_user='dbrep', master_password='Ahgqr-wEjWZL', master_port=${master_port}; start slave;"; global_finalize 5;}

        sleep 3
        sql_thread_status=`mysql -S /tmp/mysql.sock${SOCKNUM} -s -e "show slave status\G;" | grep "Slave_SQL_Running" | sed 's/^.*: //g'` \
        || { save_log ${FUNCNAME} "error" "Fail to get 'Slave_SQL_Running'"; global_finalize 5;}
        io_thread_status=`mysql -S /tmp/mysql.sock${SOCKNUM} -s -e "show slave status\G;" | grep "Slave_IO_Running" | sed 's/^.*: //g'` \
        || { save_log ${FUNCNAME} "error" "Fail to get 'Slave_IO_Running'"; global_finalize 5;}

        if [ "${sql_thread_status}" == "Yes" -a "${io_thread_status}" == "Yes" ]; then
            save_log ${FUNCNAME} "info"
        else
            save_log ${FUNCNAME} "error" "Slave change to master fail. sql_thread: ${sql_thread_status}, io_thread: ${io_thread_status}"; global_finalize 8
        fi
    fi    
}
