#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    在server上首次添加redis实例
#    自动部署redis相关环境并启动redis:
#        1) 创建相关目录.
#        2) 自动配置redis相关配置.
#        3) 安装redis实例.
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
            REDIS_MEM=${OPTARG}
            ;;
        h)
            echo -e "\nUsage: $0 [-v] [-m]"
            echo -e "---------------------------------------------------------------------------------------"
            echo -e "\033[32m-v                  Redis version. defult 2.6.17\033[0m"
            echo -e "\033[32m-m                  Redis memory.eg:1,,8,16 defult 1G\033[0m"
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
    VERSION="2.6.17"
fi

if [ "${REDIS_MEM}" == "" ]; then
    REDIS_MEM="1"
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
SOFTWARE_SRC="${SOFTWARE_DIR}/redis-${VERSION}.tar.gz"
SOFTWARE_IST="redis-${VERSION}"
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

    # 检查host上是否已经部署了redis实例.
    redis_ps=`ps aux | grep redis | grep -v grep | grep -v .sh`
    if [ -e "/usr/local/${SOFTWARE_IST}" -o "${redis_ps}" != "" ]; then
        { save_message ${FUNCNAME} "error" "The host already has a redis instance."; global_finalize 100400;}
    fi

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 安装MEMCACHED安.
# ----------------------------------------------------------------------------------------
function install_redis {
    tar -zxvf ${SOFTWARE_SRC} -C /usr/local/ \
    || { save_message ${FUNCNAME} "error" "When tar -zxvf ${SOFTWARE_SRC} -C /usr/local/."; global_finalize 100101;}

    cd /usr/local/${SOFTWARE_IST}
    
    make \
    || { save_message ${FUNCNAME} "error" "When make."; global_finalize 000203;}

    make install \
    || { save_message ${FUNCNAME} "error" "When make insatll."; global_finalize 000202;}
    
    cd -

    #调优内存分配策略
    echo "vm.overcommit_memory=1" >> /etc/sysctl.conf
    sysctl vm.overcommit_memory=1

    #配置基础conf文件
    cp -f ${SOFTWARE_DIR}/redis.conf /etc/

    #设置最大可用内存
    sed -i "s/1000000000/${REDIS_MEM}000000000/g" /etc/redis.conf

    #创建redis数据目录
    mkdir -p /data/db/redis/

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 启动并检测mongod是否启动成功.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/redis/start_redis.sh    # 导入函数 start_mongod


# ----------------------------------------------------------------------------------------
# 主执行逻辑.
# ----------------------------------------------------------------------------------------
function main {
    global_initialize "$$" "$0"
    own_initialize
    install_redis
    start_redis
    global_finalize 0
}

main

