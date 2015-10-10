#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    在server上安装python
#    自动部署python:
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
            echo -e "\nUsage: $0 [-v] "
            echo -e "---------------------------------------------------------------------------------------"
            echo -e "\033[32m-v                  Python version. defult 2.7.8\033[0m"
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
    VERSION="2.7.8"
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
SOFTWARE_SRC="${SOFTWARE_DIR}/Python-${VERSION}.tar.gz"
SOFTWARE_IST="Python-${VERSION}"
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

    # 检查host上是否已经部署了python.
    if [ `which "python" >/dev/null 2>&1;echo $?` == "0" ]; then
        python_v=`python -V 2>&1 | awk -F '.' '{print $2}'`
        if [ "${python_v}" -lt "7" ]; then
            python_i="1"
        fi
    else
        python_i="1"
    fi

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 安装Python.
# ----------------------------------------------------------------------------------------
function install_python {
    #安装相关依赖
    yum -y install bzip2*

    #安装python
    tar -zxvf ${SOFTWARE_SRC} -C /usr/local/ \
    || { save_message ${FUNCNAME} "error" "When tar -zxvf ${SOFTWARE_SRC} -C /usr/local/."; global_finalize 100101;}

    cd /usr/local/${SOFTWARE_IST}

    ./configure \
    || { save_message ${FUNCNAME} "error" "When ./configure ... ."; global_finalize 000203;}
    
    make \
    || { save_message ${FUNCNAME} "error" "When make."; global_finalize 000203;}

    make install \
    || { save_message ${FUNCNAME} "error" "When make insatll."; global_finalize 000202;}
    
    cd -

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 主执行逻辑.
# ----------------------------------------------------------------------------------------
function main {
    global_initialize "$$" "$0"
    own_initialize
    if [ "${python_i}" == "1" ]; then
        install_python
    else
        save_message ${FUNCNAME} "error" "The host already has python and version is greater than the 2.7.x."; 
        global_finalize 100700;
    fi
    global_finalize 0
}

main
