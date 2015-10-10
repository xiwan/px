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
# Add New DB Instance to mydb.
# ----------------------------------------------------------------------------------------
function add_ins_to_mydb {
    local dbname1=`echo ${DBNAMES} | awk -F '|' '{print $1}'`
    local dbname2=`echo ${DBNAMES} | awk -F '|' '{print $2}'`
    local dbname3=`echo ${DBNAMES} | awk -F '|' '{print $3}'`

    mysql -h ${MYDB_IP} -u ${MYDB_USR} -p${MYDB_PWD} -P ${MYDB_PORT} -e \
        "replace into main.db_list 
        (pro_type, pro_name, platid, insname, platname, channel, server_id, master_slave, ip,
        port, user, pwd, ifproduct, hostname, dbname1, dbname2, dbname3, dblabel) 
        values ('${PRO_TYPE}', '${PRO_NAME}', '${PLAT_ID}', '${INSNAME}', '${PLAT_NAME}', '${CHANNEL}',
        '${SERVER_ID}', ${MASTER_SLAVE}, '${IP}', ${PORT},
        '${DB_USER}', AES_ENCRYPT('${DB_PWD}', 'ty'), 1,
        '${HOSTNAME}', '${dbname1}', '${dbname2}', '${dbname3}', '${INSNAME}');" \
    || { save_log ${FUNCNAME} "error" "Fail to run sql: replace into main.db_list ..."; global_finalize 5;}


    save_log ${FUNCNAME} "info" "${INSNAME} done."
}
