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
function start_memcached {
    my_ip=$1
    memcache_mem=$2

    /usr/bin/memcached -u root -d -m ${memcache_mem} -l ${my_ip} -p 11211

    local i=0
    echo -e "\033[32mStarting mongod ...\033[0m"
    while true
    do
        port_ch=`netstat -ntl | grep -w 11211`
        if [ "${port_ch}" == "" ]; then
            local debuginfo="Port 11211"
        else
            break
        fi
        sleep 5
        i=$(($i + 5))
        if [ "$i" -gt "60" ]; then
            save_message ${FUNCNAME} "error" "Can't find ${debuginfo}."; global_finalize 100301
        fi
    done

    save_message ${FUNCNAME} "info"
}

