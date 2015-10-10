#!/bin/bash
#
#    (C) 2005-2013 PPStream Inc.
#
#        用于自动化部署平台
#    本脚本为自动化部署平台定制入口.
#   
#    Authors:  
#    lushichao 2014-09-21 <shichao.lu@denachina.com>
#
#    Last update:
#    lushichao 2014-06-10


# ----------------------------------------------------------------------------------------
# 获取并验证命令行参数.
# ----------------------------------------------------------------------------------------
while getopts "t:i:j:h" arg
do
    case ${arg} in
        t)
            DEPLOY_TYPE=${OPTARG}
            ;;
        j)
            JOB_ID=${OPTARG}
            ;;
        i)
            TARGET_IP=${OPTARG}
            ;;
        h)
            echo -e "\nUsege: $0 -j JOB_ID -i TARGET_IP -t DEPLOY_TYPE"
            echo -e "                                   if -t mysql INNODB_MEM MASTER_SLAVE"
            echo -e "                                   if -t memcached MEMCACH_MEM"
            echo -e "                                   if -t redis REDIS_MEM"
            echo "--------------------------------------------------------------------------------------------------------------"
            echo -e "\033[32m-j JOB_ID:                           CMDB Job id.\033[0m"
            echo -e "\033[32m-i TARGET_IP:                        eg:10.10.15.45.\033[0m"
            echo -e "\033[32m-t DEPLOY_TYPE:                      mongodb|mysql|redis|memcached|python|node|puppet.\033[0m"
            echo -e "    if -t mysql:"
            echo -e "\033[32m        INNODB_MEM:                      Innodb buff pool size.eg:1,2,4\033[0m"
            echo -e "\033[32m        MASTER_SLAVE:                    Mysqld master or slave.eg:1(master),2(slave),3(backup)\033[0m"
            echo -e "    if -t memcached:"
            echo -e "\033[32m        MEMCACH_MEM:                     Memcached memory size.eg:1024,512\033[0m"
            echo -e "    if -t redis:"
            echo -e "\033[32m        REDIS_MEM:                       Redis memory size.eg:1,8,16\033[0m"
            exit 1
            ;;
        ?)  #当有不认识的选项的时候arg为?
            echo "Try \`$0 -h' for more information."
            exit 1
            ;;
    esac
done

shift $((${OPTIND} - 1))

if [ "${JOB_ID}" == "" -o "${TARGET_IP}" == "" -o "${DEPLOY_TYPE}" == "" ]; then
    echo "Try \`$0 -h' for more information."
    exit 1
fi

DEPLOY_TYPE=`echo ${DEPLOY_TYPE} | tr "[:upper:]" "[:lower:]"`
if [ "${DEPLOY_TYPE}" == "mysql" -a "$#" == "2" ]; then
    INNODB_MEM=$1
    MASTER_SLAVE=$2
    _DEPLOY_TYPE="2"
elif [ "${DEPLOY_TYPE}" == "memcached" -a "$#" == "1" ]; then
    MEMCACH_MEM=$1
    _DEPLOY_TYPE="3"
elif [ "${DEPLOY_TYPE}" == "redis" -a "$#" == "1" ]; then
    REDIS_MEM=$1
    _DEPLOY_TYPE="4"
elif [ "${DEPLOY_TYPE}" != "mysql" -a "${DEPLOY_TYPE}" != "memcached" -a \
       "${DEPLOY_TYPE}" != "redis" -a "$#" == "0" ]; then
    _DEPLOY_TYPE="1"
else
    echo "Try \`$0 -h' for more information."
    exit 1
fi

_COMMAND=`echo "JOB_ID:${JOB_ID},TARGET_IP:${TARGET_IP},DEPLOY_TYPE:${DEPLOY_TYPE}"`
# ----------------------------------------------------------------------------------------
# 模块变量.
# ----------------------------------------------------------------------------------------
# -----> Global Variables
LIB_DIR=`dirname "$0"`/../lib
SOFTWARE=`dirname "$0"`/../software
source ${LIB_DIR}/global_var.sh
# <----- Global Variables


# ----------------------------------------------------------------------------------------
# 打印并保存日志信息.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/save_message.sh    # 导入函数 save_message


# ----------------------------------------------------------------------------------------
# 通用初始化部分.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/global_initialize.sh    # 导入函数 global_initialize


# ----------------------------------------------------------------------------------------
# 非通用初始化部分.
# ----------------------------------------------------------------------------------------
function own_initialize {
    JOB_ID=`echo ${JOB_ID} | tr "[:upper:]" "[:lower:]"`
    DEPLOY_TYPE=`echo ${DEPLOY_TYPE} | tr "[:upper:]" "[:lower:]"`
    TARGET_IP=`echo ${TARGET_IP} | tr "[:upper:]" "[:lower:]"`
    MASTER_SLAVE=`echo ${MASTER_SLAVE} | tr "[:upper:]" "[:lower:]"`

    INFRA_ADMIN_PATH="/opt/infra_admin"
    INFRA_TOOLSZIP_PATH="/opt/infra_admin/infra_lsc_tools.zip"
    INFRA_TOOLS_DIR="/opt/infra_admin/infra_lsc_tools/sh-bin"
    INFRA_TOOLS_INSTALL_DIR="/opt/infra_admin/infra_lsc_tools/sh-bin/install-sh"

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 通用结束部分.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/global_finalize.sh    # 导入函数 global_finalize



# ----------------------------------------------------------------------------------------
# 检查ssh连接.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/ssh_check.sh    # 导入函数 ssh_check


# ----------------------------------------------------------------------------------------
# 初始化目标服安装环境.
# ----------------------------------------------------------------------------------------
function set_install_environment {
    #检测ssh连接
    ssh_check ${TARGET_IP}
    #初始化infra_admin目录
    ${bin_ssh} root@${TARGET_IP} "mkdir -p ${INFRA_ADMIN_PATH};rm -rf ${INFRA_ADMIN_PATH}/infra_lsc_tools*" \
    || { save_message ${FUNCNAME} "error" "${bin_ssh} root@${TARGET_IP} \"mkdir -p ${INFRA_ADMIN_PATH};rm -rf ${INFRA_ADMIN_PATH}/infra_lsc_tools*\""; global_finalize 000103;}
    #复制安装工具包并且解压
    ${bin_scp} ${INFRA_TOOLSZIP_PATH} root@${TARGET_IP}:${INFRA_ADMIN_PATH}/ \
    || { save_message ${FUNCNAME} "error" "${bin_scp} ${INFRA_TOOLSZIP_PATH} root@${TARGET_IP}:${INFRA_ADMIN_PATH}/"; global_finalize 000103;}
    ${bin_ssh} root@${TARGET_IP} "unzip -o -q ${INFRA_ADMIN_PATH}/infra_lsc_tools.zip -d ${INFRA_ADMIN_PATH}/" \
    || { save_message ${FUNCNAME} "error" "${bin_ssh} root@${TARGET_IP} \"unzip -o -q ${INFRA_ADMIN_PATH}/infra_lsc_tools.zip -d ${INFRA_ADMIN_PATH}/\""; global_finalize 000103;}

    #安装目标服必要应用
    ${bin_ssh} root@${TARGET_IP} "${bin_sh} ${INFRA_TOOLS_DIR}/environment_check.sh"

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 根据部署方式检查配置信息是否合法.
# ----------------------------------------------------------------------------------------
function safe_param {
    case ${_DEPLOY_TYPE} in
        1)
            if [ "${JOB_ID}" == "" -o "${TARGET_IP}" == "" -o "${DEPLOY_TYPE}" == "" ]; then
                { save_message ${FUNCNAME} "error" "Some param is not specified."; global_finalize 000001;}
            fi
            ;;
        2)
            if [ "${JOB_ID}" == "" -o "${TARGET_IP}" == "" -o "${DEPLOY_TYPE}" == "" -o \
                 "${MASTER_SLAVE}" == "" -o "${INNODB_MEM}" == "" ]; then
                { save_message ${FUNCNAME} "error" "Some param is not specified."; global_finalize 000001;}
            fi
            ;;
        3)
            if [ "${JOB_ID}" == "" -o "${TARGET_IP}" == "" -o "${DEPLOY_TYPE}" == "" -o \
                 "${MEMCACH_MEM}" == "" ]; then
                { save_message ${FUNCNAME} "error" "Some param is not specified."; global_finalize 000001;}
            fi
            ;;
        4)
            if [ "${JOB_ID}" == "" -o "${TARGET_IP}" == "" -o "${DEPLOY_TYPE}" == "" -o \
                 "${REDIS_MEM}" == "" ]; then
                { save_message ${FUNCNAME} "error" "Some param is not specified."; global_finalize 000001;}
            fi
            ;;
        ?)  
            { save_message ${FUNCNAME} "error" "Wrong deploy type."; global_finalize 000001;}
            ;;
    esac

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 根据部署方式执行部署脚本.
# ----------------------------------------------------------------------------------------
function run_script_by_deploy_type {
    case ${DEPLOY_TYPE} in
        mongodb)
            safe_param
            set_install_environment
            ${bin_ssh} root@${TARGET_IP} "${bin_sh} ${INFRA_TOOLS_INSTALL_DIR}/mongodb_install.sh" \
            || { save_message ${FUNCNAME} "error" "Fail to run mongodb_install.sh."; global_finalize 100204;}
            ;;
        mysql)
            safe_param
            set_install_environment
            ${bin_ssh} root@${TARGET_IP} "${bin_sh} ${INFRA_TOOLS_INSTALL_DIR}/mysql_install.sh -m ${INNODB_MEM} ${MASTER_SLAVE}" \
            || { save_message ${FUNCNAME} "error" "Fail to run mysql_install.sh."; global_finalize 100204;}
            ;;
        redis)
            safe_param
            set_install_environment
            ${bin_ssh} root@${TARGET_IP} "${bin_sh} ${INFRA_TOOLS_INSTALL_DIR}/redis_install.sh -m ${REDIS_MEM}" \
            || { save_message ${FUNCNAME} "error" "Fail to run redis_install.sh."; global_finalize 100402;}
            ;;
        memcached)
            safe_param
            set_install_environment
            ${bin_ssh} root@${TARGET_IP} "${bin_sh} ${INFRA_TOOLS_INSTALL_DIR}/memcached_install.sh -m ${MEMCACH_MEM}" \
            || { save_message ${FUNCNAME} "error" "Fail to run memcached_install.sh."; global_finalize 100302;}
            ;;
        nginx)
            safe_param
            set_install_environment
            ${bin_ssh} root@${TARGET_IP} "${bin_sh} ${INFRA_TOOLS_INSTALL_DIR}/nginx_install.sh" \
            || { save_message ${FUNCNAME} "error" "Fail to run nginx_install.sh."; global_finalize 100502;}
            ;;
        python)
            safe_param
            set_install_environment
            ${bin_ssh} root@${TARGET_IP} "${bin_sh} ${INFRA_TOOLS_INSTALL_DIR}/python_install.sh" \
            || { save_message ${FUNCNAME} "error" "Fail to run python_install.sh."; global_finalize 100702;}
            ;;
        node)
            safe_param
            set_install_environment
            ${bin_ssh} root@${TARGET_IP} "${bin_sh} ${INFRA_TOOLS_INSTALL_DIR}/node_install.sh" \
            || { save_message ${FUNCNAME} "error" "Fail to run node_install.sh."; global_finalize 100602;}
            ;;
        puppet)
            safe_param
            set_install_environment
            ${bin_ssh} root@${TARGET_IP} "${bin_sh} ${INFRA_TOOLS_INSTALL_DIR}/puppet_install.sh" \
            || { save_message ${FUNCNAME} "error" "Fail to run puppet_install.sh."; global_finalize 100802;}
            ;;
    esac

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 非通用结束部分.
# ----------------------------------------------------------------------------------------
#function own_finalize {
#    rm -f ${DEPLOY_TYPE_FILE}      # 删除安装类型文件
#    rm -rf ${GIT_DIR}              # 删除git目录
#
#    save_message ${FUNCNAME} "info"
#}


# ----------------------------------------------------------------------------------------
# 主执行逻辑.
# ----------------------------------------------------------------------------------------
function main {
    global_initialize "$$" "${BASENAME}"
    own_initialize
    run_script_by_deploy_type
    global_finalize 0
}

main
