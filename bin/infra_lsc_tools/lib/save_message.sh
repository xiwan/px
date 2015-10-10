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
# Print and save log messages.
# ----------------------------------------------------------------------------------------
function save_message() {
    local func_name=`echo $1 | sed 's/\b[a-z]/\U&/g'`  # 将函数名首字母大写后传入变量
    local debug_level=`echo "[$2]" | sed 's/[a-z]/\U&/g'`
    local message=$3
    local datetime__=`date +'%y%m%d %H:%M:%S'`

    #打印信息颜色调配
    func_name=`echo "\033[33m${func_name}\033[0m"`
    if [ `echo "${debug_level}" | grep -ie error` ];then
        debug_level=`echo "\033[41m${debug_level}\033[0m"`
    else
        debug_level=`echo "\033[32m${debug_level}\033[0m"`
    fi

    # 生成debug信息.
    if [ "${message}" == "" ]; then
        debug_info="${debug_level} ${func_name} done."
        # 如果没有指定message信息,则自动生成函数完成信息.
    else
        debug_info="${debug_level} ${func_name}: ${message}"
        # 如果指定了message信息,则生成函数的message信息.
    fi

    echo -e "${debug_info}"
    DEBUG_INFOS="${DEBUG_INFOS}${datetime__} ${debug_info}\n"
}
