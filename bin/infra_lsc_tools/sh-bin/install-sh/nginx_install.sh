#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    在server上首次添加nginx实例
#    自动部署redis相关环境并启动nginx:
#        1) 创建相关目录.
#        2) 自动配置nginx相关配置.
#        3) 安装nginx实例.
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
            echo -e "\033[32m-v                  Redis version. defult 1.6.1\033[0m"
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
    VERSION="1.6.1"
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
SOFTWARE_SRC="${SOFTWARE_DIR}/nginx-${VERSION}.tar.gz"
SOFTWARE_IST="nginx-${VERSION}"
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

    # 检查host上是否已经部署了nginx实例.
    nginx_ps=`ps aux | grep nginx | grep -v grep | grep -v .sh`
    if [ -e "/usr/local/${SOFTWARE_IST}" -o "${nginx_ps}" != "" ]; then
        { save_message ${FUNCNAME} "error" "The host already has a nginx instance."; global_finalize 100500;}
    fi

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 安装Nginx.
# ----------------------------------------------------------------------------------------
function install_nginx {
    #安装相关依赖
    yum -y install *pcre*
    yum -y install openssl*

    #安装apps-start-stop
    tar zxvf ${SOFTWARE_DIR}/apps-sys-utils-start-stop-daemon-IR1_9_18-2.tar.gz -C /usr/local/ \
    || { save_message ${FUNCNAME} "error" "When tar -zxvf ${SOFTWARE_SRC} -C /usr/local/."; global_finalize 100101;}

    cd /usr/local/apps/sys-utils/start-stop-daemon-IR1_9_18-2
    cc start-stop-daemon.c -o start-stop-daemon
    cp start-stop-daemon /usr/local/bin/start-stop-daemon
    cd -

    #安装nginx
    tar -zxvf ${SOFTWARE_SRC} -C /usr/local/ \
    || { save_message ${FUNCNAME} "error" "When tar -zxvf ${SOFTWARE_SRC} -C /usr/local/."; global_finalize 100101;}

    cd /usr/local/${SOFTWARE_IST}

    ./configure --sbin-path=/usr/local/sbin --with-http_ssl_module --without-mail_pop3_module --without-mail_imap_module --without-mail_smtp_module --with-http_stub_status_module \
    || { save_message ${FUNCNAME} "error" "When ./configure --sbin-path=/usr/local/sbin --with-http_ssl_module --wit... ."; global_finalize 000203;}
    
    make \
    || { save_message ${FUNCNAME} "error" "When make."; global_finalize 000203;}

    make install \
    || { save_message ${FUNCNAME} "error" "When make insatll."; global_finalize 000202;}
    
    cd -

    ln -s /usr/local/nginx/conf /etc/nginx
    
    #调优fastcgi_params
    echo -e "
fastcgi_connect_timeout 60;
fastcgi_send_timeout 180;
fastcgi_read_timeout 180;
fastcgi_buffer_size 128k;
fastcgi_buffers 4 256k;
fastcgi_busy_buffers_size 256k;
fastcgi_temp_file_write_size 256k;
fastcgi_intercept_errors on;" >> /etc/nginx/fastcgi_params

    #配置nginx_start
    cp ${SOFTWARE_DIR}/nginx_start /etc/init.d/nginx
    chmod 755 /etc/init.d/nginx

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 启动并检测nginx是否启动成功.
# ----------------------------------------------------------------------------------------
source ${LIB_DIR}/nginx/start_nginx.sh    # 导入函数 start_nginx


# ----------------------------------------------------------------------------------------
# 主执行逻辑.
# ----------------------------------------------------------------------------------------
function main {
    global_initialize "$$" "$0"
    own_initialize
    install_nginx
    start_nginx
    global_finalize 0
}

main
