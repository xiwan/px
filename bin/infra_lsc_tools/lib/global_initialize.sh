#!/bin/bash
#
#    (C) 2005-2013 PPStream Inc.
#
#        FUNCTION USE IN SOME SCRIPT
#    Use in /usr/mysql/bin .
#   
#    Authors:  
#    lushichao 2013-09-14 <lushichao@denachina.com> 
#
#    Last update:
#    lushichao 2013-09-14


# ----------------------------------------------------------------------------------------
# Global initialize.
# ----------------------------------------------------------------------------------------
function global_initialize {
    # 检查并创建锁
    pid=$1
    check_sheel_name=`echo $2 | grep -E "auto_deploy_db.sh|node_install.sh"`
    if [ "${check_sheel_name}" == "" ];then
        while [ -f /tmp/my_shell.lock ]
        do
            lock_info=`cat /tmp/my_shell.lock`
            lock_time=`echo ${lock_info} | awk -F " " '{print $1}'`
            lock_pid=`echo ${lock_info} | awk -F " " '{print $2}'`
            # check_pid=`ps aux | awk '{print $2}' |  sed -n "/\<${lock_pid}\>/"p`
            kill -s 0 $lock_pid &>/dev/null || check_pid="not_in"
            if [ "${check_pid}" == "not_in" ];then
                save_message "create lock" "info"
                echo "${UNIX_NANOSECONDS} ${pid}" > /tmp/my_shell.lock || { save_message ${FUNCNAME} "error" "create my_shell.lock failure!";global_finalize 000102;}
                break
            else
                sleep_times=`expr ${sleep_times} + 1`
                if [ ${sleep_times} == "1" ];then
                    echo "Other scripts are executing, plese wait."
                fi
                sleep 5
            fi
        done
        echo "${UNIX_NANOSECONDS} ${pid}" > /tmp/my_shell.lock || { save_message ${FUNCNAME} "error" "create my_shell.lock failure!";global_finalize 000102;}
    fi

    #删除过期的日志
    find ${CWD} -name "*.log" -type f -mtime +0 -exec rm -f {} \;

    # 创建debug file.
    if ! test -e ${DEBUG_FILE}; then
        > ${DEBUG_FILE}
    elif ! cat ${DEBUG_FILE} | grep -q ${DATE_}; then
        > ${DEBUG_FILE}
    fi
    DEBUG_INFOS="${DEBUG_INFOS}${COMMAND}\n------------------------------------------------------------\n"

    cd ${CWD}    # cd到脚本所在目录

    save_message ${FUNCNAME} "info"
}

