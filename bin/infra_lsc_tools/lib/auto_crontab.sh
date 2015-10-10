#!/bin/bash
#
#    (C) 2005-2013 PPStream Inc.
#
#    AUTO WRITE CRONTAB TASK
# You can config minute and hour and its interval.
# You also can specify if comment the task.
# The calculate result will be echo.
#   
#    Authors:  
#    lushichao 2012-12-11 <lushichao@denachina.com> 
#
#    Last update
#    lushichao 2013-12-26

PATH=${PATH}:/usr/local/mysql/bin:/usr/mysql/bin:/sbin
export PATH


# ----------------------------------------------------------------------------------------
# 获取并验证命令行参数.
# ----------------------------------------------------------------------------------------
while getopts "m:j:h" arg
do
    case ${arg} in
        m)
            MIN_START_END=${OPTARG}
            ;;
        j)  
            HOUR_START_END=${OPTARG}
            ;;
        h)
            echo -e "\nUsege: $0 -m MIN_START_END [-j HOUR_START_END] KEYWORD IF_COMMENT"
            echo "---------------------------------------------------------------------------------"
            echo "MIN_START_END:            15_0_59 (from 0 to 59 minute every 15 minute)"
            echo "HOUR_START_END:           1_1_6 (from 1 to 6 o'clock every 1 hour)"
            echo "KEYWORD:                  backup.sh (keyword use to grep crontab)"
            echo "IF_COMMENT:               1:comment, 0:not comment"
            exit 1
            ;;
        ?)  #当有不认识的选项的时候arg为?
            echo "Try \`$0 -h' for more information."
            exit 1
            ;;
    esac
done

shift $((${OPTIND} - 1))

if [ "$#" == "2" ]; then 
    KEYWORD=$1
    IF_COMMENT=$2
else
    echo "Try \`$0 -h' for more information."
    exit 1
fi


# ----------------------------------------------------------------------------------------
# 模块变量.
# ----------------------------------------------------------------------------------------
# -----> Minute Variables
MIN=`echo ${MIN_START_END} | awk -F '_' '{print $1}'`          # 分钟间隔
MIN_START=`echo ${MIN_START_END} | awk -F '_' '{print $2}'`    # 分钟起始
MIN_END=`echo ${MIN_START_END} | awk -F '_' '{print $3}'`      # 分钟结束
MINS=`seq ${MIN_START} ${MIN} ${MIN_END}`                      # 分钟序列
# <----- Minute Variables

# -----> Hour Variables
HOUR=`echo ${HOUR_START_END} | awk -F '_' '{print $1}'`        # 小时间隔
HOUR_START=`echo ${HOUR_START_END} | awk -F '_' '{print $2}'`  # 小时起始
HOUR_END=`echo ${HOUR_START_END} | awk -F '_' '{print $3}'`    # 小时结束
HOURS=`seq ${HOUR_START} ${HOUR} ${HOUR_END} 2> /dev/null`     # 小时序列
# <----- Hour Variables


# ----------------------------------------------------------------------------------------
# 如果存在还未被使用的定时点可用,则创建crontab任务.
# ----------------------------------------------------------------------------------------
function timing_not_exists() {
    if [ "${HOUR_START_END}" != "" ]; then
        for hour in ${HOURS}
        do
            for min in ${MINS}
            do
                if ! cat /var/spool/cron/root | grep "${KEYWORD}" | grep -E -q "(^${min} ${hour}|^# *${min} ${hour})"; then
                    if [ "${IF_COMMENT}" -eq 0 ]; then
                        echo "${min} ${hour}"
                    elif [ "${IF_COMMENT}" -eq 1 ]; then
                        echo "#${min} ${hour}"
                    fi
                    exit 0
                fi
            done
        done
    elif [ "${HOUR_START_END}" == "" ]; then
        for min in ${MINS}
        do
            if ! cat /var/spool/cron/root | grep "${KEYWORD}" | grep -E -q "(^${min} |^# *${min} )"; then
                if [ "${IF_COMMENT}" -eq 0 ]; then
                    echo "${min}"
                elif [ "${IF_COMMENT}" -eq 1 ]; then
                    echo "#${min}"
                fi
                exit 0
            fi
        done
    fi
}


# ----------------------------------------------------------------------------------------
# 如果所有的定时点都已经被使用了,那么就找出条数最少的那个任务的时间点并使用.
# ----------------------------------------------------------------------------------------
function timing_exists() {
    if [ "${HOUR_START_END}" != "" ]; then
        mincount_task=`crontab -l | grep "${KEYWORD}" | awk -F ' ' '{print $1"_"$2}' | sort | uniq -c | \
            awk -F ' ' 'BEGIN{m=999} {if($1<m){m=$1; n=$2}} END{print n}' | sed 's/_/ /g' | sed 's/#//g'`
    
        if [ "${IF_COMMENT}" -eq 0 ]; then
            echo ${mincount_task}
        elif [ "${IF_COMMENT}" -eq 1 ]; then
            echo "#${mincount_task}"
        fi
    elif [ "${HOUR_START_END}" == "" ]; then
        mincount_task=`crontab -l | grep "${KEYWORD}" | awk -F ' ' '{print $1}' | sort | uniq -c | \
            awk -F ' ' 'BEGIN{m=999} {if($1<m){m=$1; n=$2}} END{print n}' | sed 's/_/ /g' | sed 's/#//g'`

        if [ "${IF_COMMENT}" -eq 0 ]; then
            echo ${mincount_task}
        elif [ "${IF_COMMENT}" -eq 1 ]; then
            echo "#${mincount_task}"
        fi
    fi
}


# ----------------------------------------------------------------------------------------
# Main Function
# ----------------------------------------------------------------------------------------
function main {
    timing_not_exists
    timing_exists
}

main

