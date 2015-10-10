#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    根据ip_host(hosts)列表，推送命令以及scp文件
#        1) 根据列表ip 批量执行命令（默认同时10个进程）.
#        2) 根据列表ip逐个推送文件至指定目录.
#
#    Authors:  
#    lushichao 2014-09-21 <shichao.lu@denachina.com>
#
#    Last update:
#    lushichao 2014-09-21


# ----------------------------------------------------------------------------------------
# 获取并验证命令行参数.
# ----------------------------------------------------------------------------------------
while getopts "p:f:t:h" arg
do
    case ${arg} in
        p)
            SERVERS_LIST_PATH=${OPTARG}
            ;;
        f)
            FILTER_RULES=${OPTARG}
            ;;
        t)
            PRO_TYPE=${OPTARG}
            ;;
        h)
            echo -e "\nUsage: $0 -t scp -f FILTER_RULES [-p SERVERS_LIST_PATH] FILE_PATH TARGET_DIR_PATH"
            echo -e "---------------------------------------------------------------------------------------"
            echo -e "\nUsage: $0 -t cmd -f FILTER_RULES [-p SERVERS_LIST_PATH] CMD"
            echo -e "---------------------------------------------------------------------------------------"
            echo -e "\033[32m-t PRO_TYPE:                           scp or cmd\033[0m"
            echo -e "\033[32m-p SERVERS_LIST_PATH:                  Servers info list. defult /etc/hosts\033[0m"
            echo -e "\033[32m-f FILTER_RULES:                       Filtering rules. eg:_web,_dbm\033[0m"
            
            echo -e "\nparam only for scp:"
            echo -e "\033[32mFILE_PATH:                             Scp file path. eg:/opt/infra_admin/infra.tar.gz\033[0m"
            echo -e "\033[32mTARGET_DIR_PATH:                       Scp target path.eg:/opt/infra_admin/\033[0m"
            
            echo -e "\nparam only for cmd:"
            echo -e "\033[32mCMD:                                   Command. eg:\"ls -l\"\033[0m"
            echo -e "command mark: unzip -o -q /opt/infra_admin/xxx.zip -d /opt/infra_admin/"
            echo -e "              rm -rf /opt/infra_admin/*infra*tool*"
            echo -e ""

            exit 1
            ;;
        ?)  #当有不认识的选项的时候arg为?
            echo "Try \`$0 -h' for more information."
            exit 1
            ;;
    esac
done
shift $((${OPTIND} - 1))

if [ "${FILTER_RULES}" == "" -o "${PRO_TYPE}" == "" ]; then
    echo "Try \`$0 -h' for more information."
    exit 1
fi

# 参数赋值.
if [ "${PRO_TYPE}" == "scp" -a "$#" == "2" ]; then
    FILE_PATH=$1
    TARGET_DIR_PATH=$2
elif [ "${PRO_TYPE}" == "cmd" -a "$#" == "1" ]; then
    CMD=$1
else
    echo "Try \`$0 -h' for more information."
    exit 1
fi

# 赋默认值.
if [ "${SERVERS_LIST_PATH}" == "" ]; then
    SERVERS_LIST_PATH="/etc/hosts"
fi


# ----------------------------------------------------------------------------------------
# 模块变量.
# ----------------------------------------------------------------------------------------
# -----> Global Variables
LIB_DIR=`dirname "$0"`/../lib
SOFTWARE=`dirname "$0"`/../software
source ${LIB_DIR}/global_var.sh
# <----- Global Variables

# -----> CMD Variables
THREAD_PID=()
# cmd并发数
SESSION_LIMT=10
# <----- CMD Variables

# ----------------------------------------------------------------------------------------
# 打印并保存日志信息.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/save_message.sh    # 导入函数 save_message


# ----------------------------------------------------------------------------------------
# 通用初始化部分.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/global_initialize.sh    # 导入函数 global_initialize


# ----------------------------------------------------------------------------------------
# 通用结束部分.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/global_finalize.sh    # 导入函数 global_finalize


# ----------------------------------------------------------------------------------------
# 检查ssh连接.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/ssh_check.sh    # 导入函数 ssh_check


# ----------------------------------------------------------------------------------------
# 非通用初始化部分.
# ----------------------------------------------------------------------------------------
function own_initialize {
    HOST_INFOS=`cat ${SERVERS_LIST_PATH} | grep -v '#' | grep ${FILTER_RULES} | awk -F " " '{print $1"|"$2}'`
    IPS=`cat ${SERVERS_LIST_PATH} | grep -v '#' | grep ${FILTER_RULES} | awk -F " " '{print $1}'`
    LOGS="${CWD}/../logs/cmd_log"

    mkdir -p ${LOGS}

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 校验执行信息.
# ----------------------------------------------------------------------------------------
function check_info {
    echo "------------------------------------------------"
    echo -e "\033[34mCheck info:\033[0m
\033[34mSERVERS_LIST_PATH:\033[0m\033[0m\033[31m${SERVERS_LIST_PATH}\033[0m \n\033[34mFILTER_RULES:\033[0m\033[0m\033[31m${FILTER_RULES}\033[0m
\033[34mPRO_TYPE:\033[0m\033[0m\033[31m${PRO_TYPE}\033[0m
\033[34mFILE_PATH:\033[0m\033[31m${FILE_PATH}\033[0m \n\033[34mTARGET_DIR_PATH:\033[0m\033[31m${TARGET_DIR_PATH}\033[0m \n\033[34mCMD:\033[0m\033[31m${CMD}\033[0m"
    echo -e "\033[34mHOST_INFOS:\033[0m\n\033[31m${HOST_INFOS}\033[0m"
    read -p "The information is correct?(yes/no)"  yes_no
    if [ "${yes_no}" != "yes" ];then
       save_message ${FUNCNAME} "warning" "Check the information is not correct, exit."
       global_finalize 900100
    fi

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# scp至目标服.
# ----------------------------------------------------------------------------------------
function scp {
    for host_info in ${HOST_INFOS}
    do 
        ip=`echo ${host_info} | awk -F "|" '{print $1}'`
        host=`echo ${host_info} | awk -F "|" '{print $2}'`
        
        #scp
        ${bin_ssh} root@${ip} mkdir -p "${TARGET_DIR_PATH}"
        echo "${DATETIME} scp to ${host}(${ip}):"
        /usr/bin/scp ${FILE_PATH} root@${ip}:${TARGET_DIR_PATH}
        echo "------------------------------------------------------------"
    done

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 执行command至目标服.
# ----------------------------------------------------------------------------------------
function cmd {
    for host_info in ${HOST_INFOS}
    do
        #确认当前线程数量没有超过控制
        while [ ${#THREAD_PID[@]} -ge "${SESSION_LIMT}" ]
        do 
            for pid_idx in ${!THREAD_PID[*]}
            do
                pid_val=${THREAD_PID[$pid_idx]}
                kill -s 0 $pid_val &>/dev/null || unset THREAD_PID[$pid_idx]
            done
            THREAD_PID=("${THREAD_PID[@]}")
        done

        ip=`echo ${host_info} | awk -F "|" '{print $1}'`
        host=`echo ${host_info} | awk -F "|" '{print $2}'`
        
        #command
        echo "" > ${LOGS}/cmd_${host}.${ip}_"${DATETIME_}".log
        echo "${DATETIME} command to ${host}(${ip}):" | tee -a ${LOGS}/cmd_${host}.${ip}_"${DATETIME_}".log
        echo ${CMD} | tee -a ${LOGS}/cmd_${host}.${ip}_"${DATETIME_}".log
        echo "---------------------------------------------------------------" | tee -a ${LOGS}/cmd_${host}.${ip}_"${DATETIME_}".log
        ${bin_ssh} root@${ip} ${CMD} | tee -a ${LOGS}/cmd_${host}.${ip}_"${DATETIME_}".log >/dev/null &

        THREAD_PID=("${THREAD_PID[@]}" "$!")
    done

    while [ ${#THREAD_PID[@]} -ne "0" ]
    do
        for pid_idx in ${!THREAD_PID[*]}
        do
            pid_val=${THREAD_PID[$pid_idx]}
            kill -s 0 $pid_val &>/dev/null || unset THREAD_PID[$pid_idx]
        done
    done
    echo -e "\033[32m-----------------------------------------------------------\033[0m"
    echo -e "\033[32mResult: cat ${LOGS}/cmd_*_${DATETIME_}.log | more\033[0m"
    echo -e "\033[32m-----------------------------------------------------------\033[0m"

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 主执行逻辑.
# ----------------------------------------------------------------------------------------
function main {
    global_initialize "$$" "$0"
    own_initialize
    check_info
    ssh_check ${IPS}
    if [ "${PRO_TYPE}" == "scp" ]; then
        scp
    elif [ "${PRO_TYPE}" == "cmd" ]; then
        cmd
    fi
    global_finalize 0
}

main

