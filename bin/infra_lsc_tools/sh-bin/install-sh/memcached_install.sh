#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    在server上首次添加memcached实例
#    自动部署memcached相关环境并启动memcached:
#        1) 创建相关目录.
#        2) 自动配置memcached相关配置.
#        3) 安装memcached实例.
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
            MEM_MEMCACHED=${OPTARG}
            ;;
        h)
            echo -e "\nUsage: $0 [-v] [-m]"
            echo -e "---------------------------------------------------------------------------------------"
            echo -e "\033[32m-v                  Memcached version. defult 1.4.20\033[0m"
            echo -e "\033[32m-m                  Memcached memory. defult 512\033[0m"
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
    VERSION="1.4.20"
fi
MEM_MEMCACHED
if [ "${MEM_MEMCACHED}" == "" ]; then
    MEM_MEMCACHED="512"
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
SOFTWARE_SRC="${SOFTWARE_DIR}/memcached-${VERSION}.tar.gz"
SOFTWARE_IST="memcached-${VERSION}"
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

    # 检查host上是否已经部署了memcached实例.
    memcached_ps=`ps aux | grep memcac | grep -v grep | grep -v .sh`
    if [ -e "/usr/local/${SOFTWARE_IST}" -o "${memcached_ps}" != "" ]; then
        { save_message ${FUNCNAME} "error" "The host already has a memcached instance."; global_finalize 100300;}
    fi
    
    #安装libevent库
    yum -y install libevent*

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 安装MEMCACHED.
# ----------------------------------------------------------------------------------------
function install_memcached {
    tar -xzvf ${SOFTWARE_SRC} -C /usr/local/ \
    || { save_message ${FUNCNAME} "error" "When tar -xzvf ${SOFTWARE_SRC} -C /usr/local/."; global_finalize 100101;}

    cd /usr/local/${SOFTWARE_IST}
    
    ./configure \
    || { save_message ${FUNCNAME} "error" "When ./configure."; global_finalize 000203;}
    
    make \
    || { save_message ${FUNCNAME} "error" "When make."; global_finalize 000201;}

    make install \
    || { save_message ${FUNCNAME} "error" "When make insatll."; global_finalize 000202;}
    
    cd -

    #建立memcached至/usr/bin
    ln -s /usr/local/${SOFTWARE_IST}/memcached /usr/bin/

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 启动并检测mongod是否启动成功.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/memcached/start_memcached.sh    # 导入函数 start_mongod


# ----------------------------------------------------------------------------------------
# 主执行逻辑.
# ----------------------------------------------------------------------------------------
function main {
    global_initialize "$$" "$0"
    own_initialize
    install_memcached
    start_memcached ${IP} ${MEM_MEMCACHED}
    global_finalize 0
}

main

