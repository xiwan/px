#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    用于检测ssh连接
#
#
#    Authors:  
#    lushichao 2014-09-15 <shichao.lu@denachina.com>
#
#    Last update:
#    lushichao 2014-09-15


# ----------------------------------------------------------------------------------------
# 检查涉及的服务器ssh连接是否可用.
# ----------------------------------------------------------------------------------------
function ssh_check {
    ips=$1
    bin_ssh="/usr/bin/ssh -o StrictHostKeyChecking=no"
    for ip in ${ips}
    do 
        if_check_ip=`${bin_ssh} root@"${ip}" "ifconfig|grep addr:"${ip}""`
        if [ "${if_check_ip}" == "" ];then
            save_message ${FUNCNAME} "error" "can't ssh to IP:${ip},please check!"
            global_finalize 900101
        fi
    done

    save_message ${FUNCNAME} "info"
}
