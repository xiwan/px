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


# ----------------------------------------------------------------------------------------
# Start mysqld and check it.
# ----------------------------------------------------------------------------------------
function start_mysqld {
    /usr/local/mysql/bin/mysqld_multi start

    local i=0
    echo "[INFO] Starting mysqld ..."
    while true
    do
        if ! netstat -ntl | grep -q "3306"; then
            local debuginfo="Port 3306"
        elif ! ls -l /data/db/mysql/ | grep -q "pid"; then
            local debuginfo="pid file"
        elif ! ls -l /tmp/|grep -q "mysql.sock${SOCKNUM}";  then
            local debuginfo="sock file"
        else
            save_message ${FUNCNAME} "info"
            break
        fi
        sleep 5
        i=$(($i + 5))
        if [ "$i" -gt "180" ]; then
            save_message ${FUNCNAME} "error" "Can't find ${debuginfo}, Mysqld start fail."; global_finalize 100801
        fi
    done
}
