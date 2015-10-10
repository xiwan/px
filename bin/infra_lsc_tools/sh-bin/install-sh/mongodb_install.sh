#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    在server上首次添加mongodb实例
#    自动部署mongodb相关环境并启动mongod:
#        1) 创建相关目录.
#        2) 自动配置mongod相关配置.
#        3) 安装mongodb实例.
#        ##4) 部署备份和监控脚本.
#        ##5) 将相关信息写入db维护库(mydb).
#
#    Authors:  
#    lushichao 2014-09-21 <shichao.lu@denachina.com>
#
#    Last update:
#    lushichao 2014-09-21


# ----------------------------------------------------------------------------------------
# 获取并验证命令行参数.
# ----------------------------------------------------------------------------------------
while getopts "v:h" arg
do
    case ${arg} in
        v)
            VERSION=${OPTARG}
            ;;
        h)
            echo -e "\nUsage: $0 [-v]"
            echo -e "---------------------------------------------------------------------------------------"
            echo -e "\033[32m-v                  Mongodb version. defult 2.6.4\033[0m"
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


# 赋默认值.
if [ "${VERSION}" == "" ]; then
    VERSION="2.6.4"
fi


# ----------------------------------------------------------------------------------------
# 模块变量.
# ----------------------------------------------------------------------------------------
# -----> Global Variables
LIB_DIR=`dirname "$0"`/../../lib
SOFTWARE_DIR=`dirname "$0"`/../../software
source ${LIB_DIR}/global_var.sh
# <----- Global Variables

# -----> Install Package
# 目前用于手动部署
SOFTWARE_SRC="${SOFTWARE_DIR}/mongodb-linux-x86_64-${VERSION}.tgz"
SOFTWARE_IST="mongodb-linux-x86_64-${VERSION}"
# <----- Install Package


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
# 非通用初始化部分.
# ----------------------------------------------------------------------------------------
function own_initialize {
    #检查对应版本号的安装包是否存在
    if ! test -e ${SOFTWARE_SRC}; then
        echo "${SOFTWARE_IST} is not in ${SOFTWARE_DIR}"
        global_finalize 000100
    fi

    # 检查host上是否已经部署了mongodb实例.
    mongod_ps=`ps aux | grep mongo | grep -v grep | grep -v .sh`
    if [ -e "/data/db/mongodb" -o -e "/usr/local/${SOFTWARE_IST}" -o "${mongod_ps}" != "" ]; then
        { save_message ${FUNCNAME} "error" "The host already has a mongodb instance."; global_finalize 100200;}
    fi

    # 创建db数据目录.
    if ! test -e /data/db/mongodb; then
        mkdir -p /data/db/mongodb
    fi

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 创建mongodb安装目录并建立软链.
# ----------------------------------------------------------------------------------------
function create_install_dir {
    if ! test -e /usr/local/${SOFTWARE_IST}; then
        tar -xzvf ${SOFTWARE_SRC} -C /usr/local/ \
        || { save_message ${FUNCNAME} "error" "When tar -xzvf ${SOFTWARE_SRC} -C /usr/local/."; global_finalize 100101;}
    fi
    ln -s /usr/local/${SOFTWARE_IST} /usr/local/mongodb
    ln -sf /usr/local/${SOFTWARE_IST}/bin/* /usr/bin/

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 初始化mongod.conf配置文件.
# ----------------------------------------------------------------------------------------
function mongod_config {
    cp -f ${LIB_DIR}/mongodb/mongod.conf /etc/mongod.conf
    dos2unix /etc/mongod.conf

    save_message ${FUNCNAME} "info"
}


## ----------------------------------------------------------------------------------------
## 部署脚本并且chown.
## ----------------------------------------------------------------------------------------
#function deploy_scripts {
#    mkdir -p ${SCRIPT_DIR}; ln -s ${SCRIPT_DIR} ${HOMEDIR}/bin
#
#    # 部署lib
#    cp -af ./scripts/lib ${HOMEDIR}/bin/lib
#    echo "cp -af ./scripts/lib ${HOMEDIR}/bin/lib"
#    # 部署moniter脚本
#    cp -f ./scripts/${OS_STATUS} ${HOMEDIR}/bin/${OS_STATUS}
#    cp -f ./scripts/${DB_STATUS} ${HOMEDIR}/bin/${DB_STATUS}
#    # 部署logical脚本
#    cp -f ./scripts/${DUMP_BACKUP} ${HOMEDIR}/bin/${DUMP_BACKUP}
#    # 部署xtra_backup脚本
#    cp -f ./scripts/${XTRA_BACKUP} ${HOMEDIR}/bin/${XTRA_BACKUP}
#    # 部署inc_backup脚本
#    cp -f ./scripts/${INC_BACKUP} ${HOMEDIR}/bin/${INC_BACKUP}
#    # 部署protect_action脚本
#    cp -f ./scripts/${PROTECT_ACTION} ${HOMEDIR}/bin/${PROTECT_ACTION}
#
#    # chown脚本目录
#    chown -RH ${SYSTEM_MYSQL_USER}:${SYSTEM_MYSQL_USER} ${SCRIPT_DIR}
#
#    save_message ${FUNCNAME} "info"
#}


## ----------------------------------------------------------------------------------------
## 部署监控脚本和备份脚本crontab.
## ----------------------------------------------------------------------------------------
#function deploy_scripts_crontab {
#    # 系统监控脚本的crontab.
#    if ! grep -q "${OS_STATUS}" ${CRONTAB_FILE}; then
#        if ! cat ${CRONTAB_FILE} | tail -1 | grep -q '^$'; then
#            # 如果之前没有空行的话,增加一个空行
#            echo "" >> ${CRONTAB_FILE}
#        fi
#        echo "*/10 * * * * sh /usr/mysql/bin/${OS_STATUS} ${HOSTNAME}" >> ${CRONTAB_FILE}
#    fi
#
#    # db监控脚本的crontab.
#    if ! grep -q "${DB_STATUS}" ${CRONTAB_FILE}; then
#        echo "*/2 * * * * python /usr/mysql/bin/${DB_STATUS}" >> ${CRONTAB_FILE}
#    fi
#
#    # 保护脚本的crontab.
#    if ! grep -q "${PROTECT_ACTION}" ${CRONTAB_FILE}; then
#        echo "*/10 * * * * sh /usr/mysql/bin/${PROTECT_ACTION}" >> ${CRONTAB_FILE}
#    fi
#
#    save_message ${FUNCNAME} "info"
#}


# ----------------------------------------------------------------------------------------
# 启动并检测mongod是否启动成功.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/mongodb/start_mongod.sh    # 导入函数 start_mongod


## ----------------------------------------------------------------------------------------
## zabbix_web监控配置.
## ----------------------------------------------------------------------------------------
#function zabbix_web_config {
#    if [ "${PRO_TYPE}" == "game" ]; then
#        local dbinsgroup=`echo ${PRO_NAME} | tr [:lower:] [:upper:]`_DBINS
#    elif [ "${PRO_TYPE}" == "plat" ]; then
#        local dbinsgroup="DB_INS"
#    fi
#
#    python ./zabbix/my_zabbixapi.py -t install -g ${dbinsgroup} -i ${IP} -n ${INSNAME} -N ${HOSTNAME} ${MASTER_SLAVE}\
#    || { save_message ${FUNCNAME} "error" "When run my_zabbixapi.py -t install -g ${dbinsgroup} -i ${IP} -n ${INSNAME} -N ${HOSTNAME} ${MASTER_SLAVE}"; global_finalize 6;}
#
#    save_message ${FUNCNAME} "info"
#}
#
#
#
## ----------------------------------------------------------------------------------------
## 将db信息以邮件形式发送给相关人员.
## ----------------------------------------------------------------------------------------
#source ${LIB_DIR}/send_dbinfo_mail.sh    # 导入函数 send_dbinfo_mail


# ----------------------------------------------------------------------------------------
# 主执行逻辑.
# ----------------------------------------------------------------------------------------
function main {
    global_initialize "$$" "$0"
    own_initialize
    create_install_dir
    mongod_config
    #deploy_scripts
    #deploy_scripts_crontab
    start_mongod
    #zabbix_web_config
    #send_dbinfo_mail
    global_finalize 0
}

main
