#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    在server上首次添加node实例
#    自动部署node相关环境并启动node:
#        1) 创建相关目录.
#        2) 自动配置node相关配置.
#        3) 安装node.
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
            echo -e "\033[32m-v                  Node version. defult 0.10.31\033[0m"
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
    VERSION="0.10.31"
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
SOFTWARE_SRC="${SOFTWARE_DIR}/node-v${VERSION}.tar.gz"
SOFTWARE_IST="node-v${VERSION}"
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

    # 检查host上是否已经部署了node实例.
    if [ `which "node" >/dev/null 2>&1;echo $?` == "0" ]; then
        { save_message ${FUNCNAME} "error" "The host already has a node."; global_finalize 100601;}
    fi

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 安装Node.
# ----------------------------------------------------------------------------------------
function install_node {
    #安装相关依赖
    yum -y install gcc*
    #判断是否需要安装python
    if [ `which "python" >/dev/null 2>&1;echo $?` == "0" ]; then
        python_v=`python -V 2>&1 | awk -F '.' '{print $2}'`
        if [ "${python_v}" -lt "7" ]; then
            ${bin_sh} /opt/infra_admin/infra_lsc_tools/python_install.sh 
        fi
    else
        ${bin_sh} /opt/infra_admin/infra_lsc_tools/python_install.sh
    fi
        
    

    #安装node
    export PYTHON=`which python2`
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
# 检查node是否安装.
# ----------------------------------------------------------------------------------------
function ch_node {
    #测试node
    echo -e "//var sys = require(\"sys\");
var sys = require(\"util\");
sys.puts(\"hello_world\");" > /tmp/node_test.js
    ch_node_js=`/usr/local/bin/node /tmp/node_test.js`
    if [ "${ch_node_js}" == "hello_world" ]; then
        save_message ${FUNCNAME} "info" "Node running normally."
    else
        save_message ${FUNCNAME} "error" "Node abnormal running or not install."
        global_finalize 100600;
    fi
}


# ----------------------------------------------------------------------------------------
# 主执行逻辑.
# ----------------------------------------------------------------------------------------
function main {
    global_initialize "$$" "$0"
    own_initialize
    install_node
    ch_node
    global_finalize 0
}

main
