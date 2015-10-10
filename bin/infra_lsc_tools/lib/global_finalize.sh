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
# 通用结束部分.
# ----------------------------------------------------------------------------------------
function global_finalize() {
    exitnum=$1

    #  执行global_finalize时,删除锁文件
    if [ -f /tmp/mysql_install_zip.lock ];then
    	rm -f /tmp/mysql_install_zip.lock
    fi

    save_message ${FUNCNAME} "info"
    echo -e ${DEBUG_INFOS} >> ${DEBUG_FILE}

    END_TIME=`date +%s`
    SPEND=`expr ${END_TIME} - ${START_TIME}`
    echo -e "\033[1;32mThe ${BASENAME} run total time: ${SPEND}s\033[0m" | tee -a ${DEBUG_FILE}
    
    exit ${exitnum}
}

