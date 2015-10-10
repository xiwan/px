#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    在server上安装puppet
#    自动部署puppet:
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
            echo -e "\033[32m-v                  Puppet version. defult 3.2.0\033[0m"
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
    VERSION="3.2.0"
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
SOFTWARE_SRC="${SOFTWARE_DIR}/puppet-${VERSION}-rc2.tar.gz"
SOFTWARE_IST="puppet-${VERSION}-rc2"
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

#    # 检查host上是否已经部署了puppet.
#    if [ `which "puppet" >/dev/null 2>&1;echo $?` == "0" ]; then
#        puppet_v=`puppet -V | awk -F '.' '{print $1,$2,$3}'`
#        if [ "${puppet_v}" -lt "320" ]; then
#            puppet_i="1"
#        fi
#    else
#        puppet_i="1"
#    fi

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 安装Python.
# ----------------------------------------------------------------------------------------
function install_puppet {
    #安装相关依赖
    #安装ruby 2.0
    tar -zxvf ${SOFTWARE_DIR}/ruby-2.0.0-p576.tar.gz -C /usr/local/ \
    || { save_message ${FUNCNAME} "error" "When tar -zxvf ruby-2.0.0-p576.tar.gz -C /usr/local/."; global_finalize 100101;}

    cd /usr/local/ruby-2.0.0-p576/

    ./configure \
    || { save_message ${FUNCNAME} "error" "When ./configure ... ."; global_finalize 000203;}

    make \
    || { save_message ${FUNCNAME} "error" "When make."; global_finalize 000201;}

    make install \
    || { save_message ${FUNCNAME} "error" "When make insatll."; global_finalize 000202;}

    cd -

    #安装openssl
    tar zxvf ${SOFTWARE_DIR}/openssl-1.0.1i.tar.gz -C /usr/local/ \
    || { save_message ${FUNCNAME} "error" "When tar -zxvf openssl-1.0.1i.tar.gz -C /usr/local/."; global_finalize 100101;}

    cd /usr/local/openssl-1.0.1i/

    ./config -fPIC \
    || { save_message ${FUNCNAME} "error" "When ./config -fPIC ... ."; global_finalize 000203;}

    make \
    || { save_message ${FUNCNAME} "error" "When make."; global_finalize 000201;}

    make install \
    || { save_message ${FUNCNAME} "error" "When make insatll."; global_finalize 000202;}

    cd /usr/local/ruby-2.0.0-p576/ext/openssl/
    ruby extconf.rb --with-openssl-include=/usr/local/ssl/include/ --with-openssl-lib=/usr/local/ssl/lib \
    || { save_message ${FUNCNAME} "error" "When ruby extconf.rb --with-openssl-include=/usr/local/ssl/include/ --with-openssl-lib=/usr/local/ssl/lib ... ."; global_finalize 000203;}
    
    make \
    || { save_message ${FUNCNAME} "error" "When make."; global_finalize 000201;}
    
    make install \
    || { save_message ${FUNCNAME} "error" "When make insatll."; global_finalize 000202;}    

    cd -

    #安装facter
    tar zxvf ${SOFTWARE_DIR}/facter-1.6.8.tar.gz -C /usr/local/ \
    || { save_message ${FUNCNAME} "error" "When tar -zxvf facter-1.6.8.tar.gz -C /usr/local/."; global_finalize 100101;}

    cd /usr/local/facter-1.6.8/

    ruby install.rb

    cd -

    #安装puppet
    tar -zxvf ${SOFTWARE_SRC} -C /usr/local/ \
    || { save_message ${FUNCNAME} "error" "When tar -zxvf ${SOFTWARE_SRC} -C /usr/local/."; global_finalize 100101;}

    cd /usr/local/${SOFTWARE_IST}

    ruby install.rb

    cd -
   
    ln -sf /usr/local/${SOFTWARE_IST}/bin/* /usr/bin/

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 主执行逻辑.
# ----------------------------------------------------------------------------------------
function main {
    global_initialize "$$" "$0"
    own_initialize
#    if [ "${puppet_i}" == "1" ]; then
#        install_puppet
#    else
#        save_message ${FUNCNAME} "error" "The host already has Puppet and version is greater than the 3.2.0."; 
#        global_finalize 100700;
#    fi
    install_puppet
    global_finalize 0
}

main
