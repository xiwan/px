#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    mongod 启动脚本.
#
#    Authors:  
#    lushichao 2014-09-15 <shichao.lu@denachina.com>
#
#    Last update:
#    lushichao 2014-09-15



# ----------------------------------------------------------------------------------------
# 启动并检测mongod是否启动成功.
# ----------------------------------------------------------------------------------------
function start_mongod {
    /usr/local/mongodb/bin/mongod -f /etc/mongod.conf >> /data/db/mongodb/start_mongodb.log

    local i=0
    echo -e "\033[32mStarting mongod ...\033[0m"
    while true
    do
        master_port_ch=`netstat -ntl | grep -w 27017`
        slave_prot_ch=`netstat -ntl | grep -w 37017`
        if [ "${master_port_ch}" == "" -a "${slave_prot_ch}" == "" ]; then
            local debuginfo="Port 27017 or Port 37017"
        elif ! ls -l /data/db/mongodb/ | grep -q "pid"; then
            local debuginfo="pid file"
        else
            break
        fi
        sleep 5
        i=$(($i + 5))
        if [ "$i" -gt "180" ]; then
            save_message ${FUNCNAME} "error" "Can't find ${debuginfo}."; global_finalize 100201
        fi
    done

    save_message ${FUNCNAME} "info"
}
