#!/bin/bash
#
#    (C) 2005-2013 PPStream Inc.
#
#        FUNCTION USE IN SOME SCRIPT
#    Use in game_install.sh, game_attch_ins.sh.
#   
#    Authors:  
#    lushichao 2012-12-11 <lushichao@qiyi.com> 
#
#    Last update:
#    lushichao 2013-09-02

PATH=${PATH}:/usr/local/mysql/bin:/usr/mysql/bin:/sbin
export PATH


# ----------------------------------------------------------------------------------------
# Initialize system db, init.d and my.cnf.
# ----------------------------------------------------------------------------------------
function config_mysqld {
    /usr/local/mysql/scripts/mysql_install_db --user=mysql --datadir=/db/data/${DBLABEL} --basedir=/usr/local/mysql
    echo "$(date '+%y%m%d %T') Initialize system db." >> $DEBUGFILE
    echo "Initialize system db."
    
    cp /usr/local/mysql/support-files/mysql.server /etc/init.d/mysqld
    
    function render_my_cnf() {
        sed -i "s#^datadir.*#datadir = /db/data/${DBLABEL}#g" $1
        sed -i "s#^innodb_data_home_dir.*#innodb_data_home_dir = \/db\/data\/${DBLABEL}#g" $1
        sed -i "s#^innodb_log_group_home_dir.*#innodb_log_group_home_dir = \/db\/data\/${DBLABEL}#g" $1
        sed -i "s#^server-id.*#server-id = ${MASTER_SLAVE}#g" $1
        sed -i "s#^port.*#port = ${PORT}#g" $1
        sed -i "s#^socket.*#socket = /tmp/mysql.sock${SOCKNUM}#g" $1
        sed -i "s#^innodb_buffer_pool_size.*#innodb_buffer_pool_size = ${DBMEM}#g" $1
    }
    if [ "${MASTER_SLAVE}" -eq "1" -o  "${MASTER_SLAVE}" -eq "9" ]; then
        cp ./mycnf/${MYCNF_MASTER} /etc/my.cnf
    else
        cp ./mycnf/${MYCNF_SLAVE} /etc/my.cnf
    fi
    render_my_cnf /etc/my.cnf
    dos2unix /etc/my.cnf
    echo "$(date '+%y%m%d %T') My.cnf created.">>${DEBUGFILE}
    echo "My.cnf created."
}


if [ "$#" == "5" ]; then
    DBLABEL=$1
    MASTER_SLAVE=$2
    PORT=$3
    SOCKNUM=$4
    DBMEM=$5

    config_mysqld
elif [ "$1" == "-h"]; then
    echo -e "\nUsege: $0 DBLABEL MASTER_SLAVE PORT SOCKNUM DBMEM"
fi
