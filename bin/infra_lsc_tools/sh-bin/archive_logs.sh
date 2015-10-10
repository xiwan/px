#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    在server上归档log日志
#    归档log日志:
#        1) 根据输入的参数将目标日志压缩到指定目录，并删除以压缩的log.
#        ##2) 将已压缩的log，发送至NFS服务器.
#
#    Authors:  
#    lushichao 2014-09-21 <shichao.lu@denachina.com>
#
#    Last update:
#    lushichao 2014-09-21


# ----------------------------------------------------------------------------------------
# 获取并验证命令行参数.
# ----------------------------------------------------------------------------------------
while getopts "t:l:p:k:hr" arg
do
    case ${arg} in
        t)
            PRO_TYPE=${OPTARG}
            ;;
        l)
            LOGDIR_PATH=${OPTARG}
            ;;
        p)
            TARDIR_PATH=${OPTARG}
            ;;
        r)
            RM_ARCHIVE_LOGS="1"
            ;;
        h)
            echo -e "\nUsage: $0 [-r] -l LOGDIR_PATH -p TARDIR_PATH -t PRO_TYPE DATATIME|KEYWORD"
            echo -e "---------------------------------------------------------------------------------------"
            echo -e "\033[32m-r                      Only remove log,does not perform the archive.\033[0m"
            echo -e "\033[32m-l LOGDIR_PATH:         Log dir path.eg: /data/mgsys/log.\033[0m"
            echo -e "\033[32m-p TARDIR_PATH:         Compressed dir path.eg: /data/mgsys/log_tar\033[0m"
            echo -e "\033[32m-t PRO_TYPE:            mtime or keyword\033[0m"
            echo -e "\033[32mDATATIME|KEYWORD:       \033[0m"
            echo -e "\033[32m                        If -t keyword KEYWORD:\033[0m"
            echo -e "\033[32m                            To match with the （.log） at the end of the filename and Keyword matching filename.\033[0m"
            echo -e "\033[32m                            the match rule is *Keyword*.eg:20140501 or user_log\033[0m"
            echo -e "\033[32m                        If -t mtime DATATIME:\033[0m"
            echo -e "\033[32m                            To match with the （.log） at the end of the filename and file's mtime equal to DATATIME\033[0m"
            echo -e "\033[32m                            eg:20140708 or 201407 or 2014\033[0m"
            echo -e "\033[32m                            if DATATIME=all,Program will tar logs that mtime is more than 24 hours\033[0m"
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

# 参数赋值.
if [ "${LOGDIR_PATH}" == "" -o "${TARDIR_PATH}" == "" -o "${PRO_TYPE}" == "" ]; then
    echo "Try \`$0 -h' for more information."
    exit 1
fi

# 参数赋值.
if [ "${PRO_TYPE}" == "mtime" -a "$#" == "1" ]; then
    DATATIME=$1
elif [ "${PRO_TYPE}" == "keyword" -a "$#" == "1" ]; then
    KEYWORD=$1
else
    echo "Try \`$0 -h' for more information."
    exit 1
fi


# ----------------------------------------------------------------------------------------
# 模块变量.
# ----------------------------------------------------------------------------------------
# -----> Global Variables
LIB_DIR=`dirname "$0"`/../lib
SOFTWARE=`dirname "$0"`/../software
source ${LIB_DIR}/global_var.sh
# <----- Global Variables

# ----->NFS info
NFS_IP="xxxx"
# <-----NFS info


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
# 项目个性化化部分.
# ----------------------------------------------------------------------------------------


# ----------------------------------------------------------------------------------------
# 非通用初始化部分.
# ----------------------------------------------------------------------------------------
function own_initialize {
	#tar log info
    mkdir -p ${TARDIR_PATH}
    tar_filename=`echo "${LOGDIR_PATH}" | awk -F "/" '{print $NF}'`
    tar_file_path="${TARDIR_PATH}/${tar_filename}"
    host_name=`hostname`

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 获取需要压缩的文件路径.
# ----------------------------------------------------------------------------------------
function get_filepath {
    if [ "${PRO_TYPE}" == "keyword" ]; then
        file_path=`find "${LOGDIR_PATH}" -name "*${KEYWORD}*" | grep "\.log"`
    elif [ "${PRO_TYPE}" == "mtime" ]; then
        if [ "${DATATIME}" == "all" ]; then
            file_path=`find "${LOGDIR_PATH}" -type f -mtime +0 | grep "\.log" `
        else
            file_path=`find "${LOGDIR_PATH}" -type f -printf "%h/%f_mtime%TY%Tm%Td\n" | grep "${DATATIME}" | grep "\.log" | sed s/_mtime"${DATATIME}"//g`
        fi
    fi

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 压缩指定的日志文件.
# ----------------------------------------------------------------------------------------
function tar_log {
    tar zcvf ${tar_file_path}_${KEYWORD}_${DATETIME_}.tar.gz ${file_path} | tee -a ${CWD}/logs/archive_tar_"${DATETIME_}".log \
    || { save_message ${FUNCNAME} "error" "When tar zcvf ${tar_file_path}_${DATETIME_}.tar.gz file_path."; global_finalize 100100; }

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 删除需压缩的log.
# ----------------------------------------------------------------------------------------
function rm_archive_log {
    #archive 待定

    #rm archive log
    echo "${file_path}" >> ${CWD}/logs/archive_rm_"${DATETIME_}".log
    rm -f ${file_path}

    save_message ${FUNCNAME} "info"
}


function main {
    global_initialize "$$" "$0"
    own_initialize
    get_filepath
    if [ "${RM_ARCHIVE_LOGS}" == "1" ];then
        rm_archive_log
    else
        tar_log
    fi
    global_finalize 0
}

main
