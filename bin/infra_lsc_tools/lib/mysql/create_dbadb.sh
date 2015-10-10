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
# Create dbadb for admin
# ----------------------------------------------------------------------------------------
function create_dbadb() {
    mysql -uroot -S /tmp/mysql.sock${SOCKNUM} -e \
        " create database if not exists dba;

          use dba;

          CREATE TABLE if not exists version_log (
          plat_name varchar(20) NOT NULL DEFAULT '',
          server_id VARCHAR(20) NOT NULL DEFAULT '',
          ver VARCHAR(20) DEFAULT NULL,
          db1_datetime DATETIME DEFAULT NULL,
          db2_datetime DATETIME DEFAULT NULL,
          db3_datetime DATETIME DEFAULT NULL,
          PRIMARY KEY (plat_name,server_id)
          ) ENGINE=INNODB DEFAULT CHARSET=utf8;

          CREATE TABLE processlist (
            DATETIME datetime DEFAULT NULL,
            ID bigint(4) NOT NULL DEFAULT '0',
            USER varchar(16) NOT NULL DEFAULT '',
            HOST varchar(64) NOT NULL DEFAULT '',
            DB varchar(64) DEFAULT NULL,
            COMMAND varchar(16) NOT NULL DEFAULT '',
            TIME int(7) NOT NULL DEFAULT '0',
            STATE varchar(64) DEFAULT NULL,
            INFO longtext,
            KEY DATETIME (DATETIME)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
        " \
    || { save_log ${FUNCNAME} "error" "fail to create dba tables."; global_finalize 5;}

    save_log ${FUNCNAME} "info"
}
