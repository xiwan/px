#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    memcached 启动脚本.
#
#    Authors:  
#    lushichao 2014-09-15 <shichao.lu@denachina.com>
#
#    Last update:
#    lushichao 2014-09-15



# ----------------------------------------------------------------------------------------
# 启动并检测memcached是否启动成功.
# ----------------------------------------------------------------------------------------
function start_redis {
    /usr/local/bin/redis-server /etc/redis.conf

    local i=0
    echo -e "\033[32mStarting Redis Server ...\033[0m"
    while true
    do
        port_ch=`netstat -ntl | grep -w 6379`
        if [ "${port_ch}" == "" ]; then
            local debuginfo="Port 6379"
        elif ! ls -l /var/run/ | grep -q "pid"; then
            local debuginfo="pid file"
        else
            break
        fi
        sleep 5
        i=$(($i + 5))
        if [ "$i" -gt "120" ]; then
            save_message ${FUNCNAME} "error" "Can't find ${debuginfo}."; global_finalize 100401
        fi
    done

    save_message ${FUNCNAME} "info"
}


