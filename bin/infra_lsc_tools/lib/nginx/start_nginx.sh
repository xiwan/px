#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    nginx 启动脚本.
#
#    Authors:  
#    lushichao 2014-09-15 <shichao.lu@denachina.com>
#
#    Last update:
#    lushichao 2014-09-15



# ----------------------------------------------------------------------------------------
# 启动并检测nginx是否启动成功.
# ----------------------------------------------------------------------------------------
function start_nginx {
    /etc/init.d/nginx start

    local i=0
    while true
    do
        port_ch=`netstat -ntl | grep -w 80`
        if [ "${port_ch}" == "" ]; then
            local debuginfo="Port 80"
        elif ! ls -l /usr/local/nginx/logs/ | grep -q "pid"; then
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

