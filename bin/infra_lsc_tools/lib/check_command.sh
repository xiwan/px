#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    用于检测命令是否存在
#
#
#    Authors:  
#    lushichao 2014-09-15 <shichao.lu@denachina.com>
#
#    Last update:
#    lushichao 2014-09-15


# ----------------------------------------------------------------------------------------
# 检查命令是否存在.
# ----------------------------------------------------------------------------------------
function check_command {
    command_name=$1
    notcommand_list=""
    if [ `which "${command_name}" >/dev/null 2>&1;echo $?` != "0" ]; then
    	#处理md5sum
    	if [ "${command_name}" == "md5sum" ]; then
            command_name="md5"
    	fi
        notcommand_list=`echo "${notcommand_list} ${command_name}"`
    fi

    save_message ${FUNCNAME} "info" "${command_name} is ok."
}
