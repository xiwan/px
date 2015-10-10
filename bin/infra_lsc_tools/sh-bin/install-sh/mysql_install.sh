#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    在server上首次添加mysql实例
#    自动部署mysql相关环境并启动mysql:
#        1) 创建相关目录.
#        2) 自动配置mysql相关配置.
#        3) 安装mysql实例.
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
while getopts "v:m:h" arg
do
    case ${arg} in
        v)
            VERSION=${OPTARG}
            ;;
        m)
            DBMEM=${OPTARG}
            ;;
        h)
            echo -e "\nUsage: $0 [-v] [-m] MASTER_SLAVE"
            echo -e "---------------------------------------------------------------------------------------"
            echo -e "\033[32m-v VERSION                  Mysql version. defult 5.5.34\033[0m"
            echo -e "\033[32m-m DBMEM                    Mysql innodb_buffer_pool_size. eg:2,8,16 defult 1G\033[0m"
            echo -e "\033[32mMASTER_SLAVE                master or slave.master:1,slave:2,backup:3\033[0m"
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
    VERSION="5.5.34"
fi

if [ "${DBMEM}" == "" ]; then
    DBMEM="1"
fi

if [ "$#" == "1" ];then
   MASTER_SLAVE="$1"
else
    echo "Try \`$0 -h' for more information."
    exit 1
fi

SERVER_ID="`echo ${MASTER_SLAVE}`"

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
SOFTWARE_SRC="${SOFTWARE_DIR}/mysql-${VERSION}.x86_64.tar.gz"
SOFTWARE_IST="mysql-${VERSION}.x86_64"
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

    # 检查host上是否已经部署了mysql实例.
    mysql_ps=`ps aux | grep mysql | grep -v grep | grep -v .sh`
    if [ -e "/data/db/mysql" -o -e "/usr/local/${SOFTWARE_IST}" -o "${mysql_ps}" != "" ]; then
        { save_message ${FUNCNAME} "error" "The host already has a mysql instance."; global_finalize 100800;}
    fi

    # 创建db数据目录.
    if ! test -e /data/db/mysql; then
        mkdir -p /data/db/mysql
    fi
    
    #安装相关依赖
    yum -y install ncurses
    yum -y install MySQL-python.x86_64

    groupadd mysql
    useradd mysql -g mysql -s /sbin/nologin

    chown -RH mysql:mysql /data/db/mysql

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 创建mysql安装目录并建立软链.
# ----------------------------------------------------------------------------------------
function create_install_dir {
    if ! test -e /usr/local/${SOFTWARE_IST}; then
        tar -xzvf ${SOFTWARE_SRC} -C /usr/local/ \
        || { save_message ${FUNCNAME} "error" "When tar -xzvf ${SOFTWARE_SRC} -C /usr/local/."; global_finalize 100101;}
    fi
    ln -s /usr/local/${SOFTWARE_IST} /usr/local/mysql
    ln -sf /usr/local/${SOFTWARE_IST}/bin/* /usr/bin/

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 初始化mysql与配置文件.
# ----------------------------------------------------------------------------------------
function mysql_install_db {
    /usr/local/mysql/scripts/mysql_install_db --user=mysql --datadir=/data/db/mysql --basedir=/usr/local/mysql
    cp -f /usr/local/mysql/support-files/mysql.server /etc/init.d/mysqld

    cp -f ${LIB_DIR}/mysql/my.cnf /etc/my.cnf
    # 配置mysql.conf
    sed -i "s#^innodb_buffer_pool_size.*#innodb_buffer_pool_size = ${DBMEM}G#g"  /etc/my.cnf
    sed -i "s#^server-id.*#server-id = ${SERVER_ID}#g"  /etc/my.cnf
    
    if ! test -e /usr/lib64/libtinfo.so.5; then
        ln -s /usr/lib64/libncurses.so.5 /usr/lib64/libtinfo.so.5
    fi

    if ! test -e /lib64/libtinfo.so.5; then
        ln -s /usr/lib64/libncurses.so.5 /lib64/libtinfo.so.5
    fi

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
# 启动并检测mysqld是否启动成功.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/mysql/start_mysqld.sh    # 导入函数 start_mysqld


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
    mysql_install_db
    #deploy_scripts
    #deploy_scripts_crontab
    #start_mysqld
    #zabbix_web_config
    #send_dbinfo_mail
    global_finalize 0
}

main
