#!/bin/bash
#
#    (C) 2005-2013 PPStream Inc.
#
#        FUNCTION USE IN SOME SCRIPT
#    Use in game_install.sh, game_attch_ins.sh.
#   
#    Authors:  
#    lushichao 2012-12-11 <lushichao@denachina.com> 
#
#    Last update:
#    lushichao 2013-09-02


# ----------------------------------------------------------------------------------------
# 部署备份脚本的crontab.
# ----------------------------------------------------------------------------------------
function deploy_backup_crontab {

    # 部署游戏db备份脚本的crontab.
    if [ "${PRO_TYPE}" == "game" ]; then
        # dumpbackup crontab.
        if ! grep -E -q "${DUMP_BACKUP} -t game (-c ${CHANNEL} )?.*${PRO_NAME} ${PLAT_NAME} ${SERVER_ID} ${MASTER_SLAVE}" ${CRONTAB_FILE}; then   # ***兼容旧的命名规则(不包含渠道名的命名规则)***
            # .*    代表 [-r NFS_TOOL ].
            echo -e "\n${DUMP_BACKUP_PERIOD} sh /usr/mysql/bin/${DUMP_BACKUP} -t game -c ${CHANNEL} ${PRO_NAME} \
${PLAT_NAME} ${SERVER_ID} ${MASTER_SLAVE} ${SOCKNUM} '${DBNAMES_BAK}' ${SERVER_ID}" >> ${CRONTAB_FILE}
        fi

        # xtrabackup crontab.
        if ! grep -E -q "${XTRA_BACKUP} -t game (-c ${CHANNEL} )?.*${PRO_NAME} ${PLAT_NAME} [^ ]+ ${MASTER_SLAVE} ${SOCKNUM}" ${CRONTAB_FILE}; then
            # .*    代表 [-r NFS_TOOL ].
            # [^ ]  代表 SERVER_IDS
            echo "${XTRA_BACKUP_PERIOD} sh /usr/mysql/bin/${XTRA_BACKUP} -t game -c ${CHANNEL} ${PRO_NAME} \
${PLAT_NAME} ${SERVER_ID} ${MASTER_SLAVE} ${SOCKNUM}" >> ${CRONTAB_FILE}
        fi


    # 部署平台db备份脚本的crontab(非增量备).
    elif [ "${PRO_TYPE}" == "plat" -a "${IFINC}" != "1" ]; then
        # dumpbackup crontab
        if ! grep -q "${DUMP_BACKUP} -t plat .*${PRO_NAME} ${MASTER_SLAVE}" ${CRONTAB_FILE}; then
            # .* 代表 [-r NFS_TOOL ].

            echo -e "\n${DUMP_BACKUP_PERIOD} sh /usr/mysql/bin/${DUMP_BACKUP} -t plat ${PRO_NAME} \
${MASTER_SLAVE} ${SOCKNUM} '${DBNAMES_BAK}' ${PRO_NAME}" >> ${CRONTAB_FILE}
        fi
        # xtrabackup crontab
        if ! grep -E -q "${XTRA_BACKUP} -t plat .*${PRO_NAME} ${MASTER_SLAVE} ${SOCKNUM}" ${CRONTAB_FILE}; then
            # .*    代表 [-r NFS_TOOL ].

            echo "${XTRA_BACKUP_PERIOD} sh /usr/mysql/bin/${XTRA_BACKUP} -t plat ${PRO_NAME} \
${MASTER_SLAVE} ${SOCKNUM}" >> ${CRONTAB_FILE}
        fi

    # 部署平台db备份脚本的crontab(增量备).
    elif [ "${PRO_TYPE}" == "plat" -a "${IFINC}" == "1" ]; then
        # incbackup crontab
        if ! grep -E -q "${INC_BACKUP} .*${PRO_NAME} ${MASTER_SLAVE} ${SOCKNUM}" ${CRONTAB_FILE}; then
            # .*    代表 [-r NFS_TOOL ].

            echo "${INC_BACKUP_PERIOD} sh /usr/mysql/bin/${INC_BACKUP} ${PRO_NAME} \
${MASTER_SLAVE} ${SOCKNUM}" >> ${CRONTAB_FILE}
        fi
    fi

    save_log ${FUNCNAME} "info"
}
