#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    GET GLOBAL VARIABLES
#    Use for my_install.
#   
#    Authors:  
#    lushichao 2014-09-21 <shichao.lu@denachina.com>
#
#    Last update:
#    lushichao 2014-05-27


# ----------------------------------------------------------------------------------------
# 模块变量.
# ----------------------------------------------------------------------------------------
# -----> Init Parameter
START_TIME=`date +%s`
COMMAND="$0 ${_COMMAND} $@"
CHARSET="utf8"
PWD_=`pwd`
CWD=`dirname "$0"`
BASENAME=`basename "$0"`
DEBUG_FILE=${CWD}/../logs/log/${BASENAME%.*}.debug
bin_ssh="/usr/bin/ssh -o StrictHostKeyChecking=no"
bin_scp="/usr/bin/scp"
bin_sh="/bin/sh"
mkdir -p ${CWD}/../logs/log/
# <----- Init Parameter

# -----> Server Info
IP=`/sbin/ifconfig | grep '^ .*inet addr:10' | awk -F' ' '{print $2}' | cut -d':' -f 2 | head -n 1`
IP_SEG=`echo ${IP} | awk -F '.' '{print $2}'`
# <----- Server Info

# -----> Crontab Info
CRONTAB_FILE="/var/spool/cron/root"
# <----- Crontab Info

# -----> Date info
DATE=`date +'%Y-%m-%d'`                      # 当前日期,eg: 2013-09-25
DATE_=`date +'%y%m%d'`                       # 当前日期,eg: 130925
DATETIME=`date +'%Y-%m-%d %H:%M:%S'`         # 当前日期时间,eg: 2013-09-25 10:48:16
DATETIME_=`date +'%Y%m%d_%H%M%S'`            # 当前日期时间,eg: 20130925_104830
DATETIME__=`date +'%y%m%d %H:%M:%S'`         # 当前日期时间,eg: 130925 10:49:04
UNIX_NANOSECONDS=`date +%s%N`                # 当前纳秒级时间戳,eg: 1406253152671411599
# <----- Date info

