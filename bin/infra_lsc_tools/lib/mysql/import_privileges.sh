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
# Import privileges into mysqld
# ----------------------------------------------------------------------------------------
function import_privileges {
    mysql -uroot -S /tmp/mysql.sock${SOCKNUM} < ./privilege/${PRI_CREATE} \
    || { save_log ${FUNCNAME} "error" "Fail to import privilege: ${PRI_CREATE}"; global_finalize 5;}

    save_log ${FUNCNAME} "info"
}
