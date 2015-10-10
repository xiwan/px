#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    添加ssh key
#
#    Authors:  
#    lushichao 2014-09-21 <shichao.lu@denachina.com>
#
#    Last update:
#    lushichao 2014-09-21


# ----------------------------------------------------------------------------------------
# 获取并验证命令行参数.
# ----------------------------------------------------------------------------------------
while getopts "h" arg
do
    case ${arg} in
        h)
            echo -e "\nUsage: $0 IPS"
            echo -e "---------------------------------------------------------------------------------------"
            echo -e "\033[32mIPS                   ip.eg:\"10.10.1.1\" or \"10.10.1.1 10.10.1.2 10.10.1.3\"\033[0m"
            exit 1
            ;;
        ?)  #当有不认识的选项的时候arg为?
            echo "Try \`$0 -h' for more information."
            exit 1
            ;;
    esac
done
shift $((${OPTIND} - 1))

if [ "$#" == "1" ]; then
    IPS=$1
else
    echo "Try \`$0 -h' for more information."
    exit 1
fi


# ----------------------------------------------------------------------------------------
# 模块变量.
# ----------------------------------------------------------------------------------------
# -----> Global Variables
LIB_DIR=`dirname "$0"`/lib
SOFTWARE=`dirname "$0"`/software
source ${LIB_DIR}/global_var.sh
# <----- Global Variables


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
    #id_rsa_pub="ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDD9vtW0ERfowAIlKEv/d3fBl0B54Bn5HMgdCXJT776lTPIsyuSSWrNHnwH9QckxFB5L89t56/M7Kn5IRNMvdbKkP9KymbgpNQKyYkOPcDqUvwxz4Nlnf/yJ3W/4WlPvgB+HMbJFzVzOD5N9KpLqqHh5SZ55eQX/wM+l0XGGx1ymgQLgrQTzuphlsRHD9ceniNsZwPuekm2shumu+lTiF7O9hTXCEjWadxj0fVJq1fLBuB6ACP+8oRMyt9WXpcRK5VVnpe0gCZhJJ5d+kiG2v2ertxhoB1cuvZFsEzeNo9x9RoVS/YWmitjg6BeAr5fdPUP+M9dV+0Bde60zXrEveGT shichao.lu@cnsha-00501-mac.local"
    id_rsa_pub="ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAgEAu04nWHcOP5eEeQWcPlb0fF9w4hImwsixmLT8ii/2MoZdVYp5xQ+86uvoY56PmThBj1UXYT9/VNRdhJ876uUOCrXnvu3bTveGs4iuaIwU0kPto2Am3P3LhX/VAuW+X6TEGJvZeMNuqRs96leNH36EmKfWLE4t7po7ji2yjVe4WPN/Dq3jKmtTLtEOIcU8Yl0055ahx80Ah1sEgNf0hl2NOb16M5mxIMgID8QzpeXtunk6SwPabitIjKdu7VZFgSFICb6U0+Bzvi48fyzI3HTGXy6cqPlt9tdPGWk3zsGVDMKBYVzEtpxgfk1KvQSxTBLsvvV7QkfssxK3XFDuMnhlQOphSuSVaHgbQRlS5mm/7U97JF73ocnCPsSGaFzMx/cnLj3vC+lEld94wQLsHc32nruF8mjp5o/0jBpyUdv/e9YDA0VhuyyrCnP1GGVjYZygCIde3vj7sCfAzf7QBdFW5Z6o5TmDeh3WiuiSJ5DeIG4QI0Id/dhCZ2DEZCPyh9T6q9OKu7hrT4463dX1NyEvohUV1p7WGDrzga29Z8moKyYn29NZ/6GjqBePR6QIaIGlH82Bud/dCpemZKHh5gv0gV/eYIa3+gj92dlNtYamH3D/wRgteymPqOGS/gDsL3sb1rdYNKPQNmMly9WRxGZlKgEzTwJf6htR1KOWd684ZoM= root@waptx159.waptx.com"
#    id_rsa_rsa=`echo -e "-----BEGIN RSA PRIVATE KEY-----
#MIIEpAIBAAKCAQEAw/b7VtBEX6MACJShL/3d3wZdAeeAZ+RzIHQlyU+++pUzyLMr
#kklqzR58B/UHJMRQeS/PbeevzOyp+SETTL3WypD/Sspm4KTUCsmJDj3A6lL8Mc+D
#ZZ3/8id1v+FpT74AfhzGyRc1czg+TfSqS6qh4eUmeeXkF/8DPpdFxhsdcpoEC4K0
#E87qYZbERw/XHp4jbGcD7npJtrIbprvpU4hezvYU1whI1mncY9H1SatXywbgegAj
#/vKETMrfVl6XESuVVZ6XtIAmYSSeXfpIhtr9nq7cYaAdXLr2RbBM3jaPcfUaFUv2
#FporY4OgXgK+X3T1D/jPXVftAXXutM16xL3hkwIDAQABAoIBAG3XwBRuUxUEad1l
#amBbPYVorLOHjwstG3cig5eu0o7lGQyzmYW7D1mAb+eJ6gIq5Cy5ptylFH6aXcAe
#URIgCwiqc975Suc6nPya8O8BoGP4NhK5jZ5lDPUwNylh8UTYbLBD8wz+rGA0M4BA
#1z/omirj5khHmy30LF5mLp8Xzc7RF619jCeTUQRoOB2tJOA/2Q1krmjfF2udY0MI
#B4PeBS1ScbP7NdobpVb+CcUfdfaDpPAhmXkdARX1vpyfFbBt18U+KQLlIVeDZMP7
#zwGSgBKV7cEhOm9LVHhPQjnd5kmoKSf/qb3+58E72gKXTbLplfRBsCGygnRCmy6/
#RXvmhokCgYEA9bGvwbWi/AVrj8lDawUepy8F33h03I3Lx24QtEvQ/Q71CkqZ9gPs
#nAPKd43R1f2zBuy8f1GpB9nf/8qRBLGvURD166uaWofqX43s/OO1LCiLrILDRCC1
#2AZOsl+Fa1BHPEIDItJbmHc9MrORgwHJUgt3D0S1/6zK2nIYd9LTqpUCgYEAzC9K
#qrFMrGp5YLPP5x/ltYA/S9L3zODyqF/BQnsPiYheGIgzk9NELHJgJK9Yj+oDlGUL
#GdbBV3cu/xzDhwuJARodWXCV/NItSdIhsXvuOvZF+RhbDNeLhxNDc92kMu3yR+PL
#fh3nhWGsvjjuixvVfEzE5jobN/DN9H6CqsRk+YcCgYBgEBFAE9yd3SCpH3AUr/PE
#OkZ5kYdflLFQUGCHnf0gdHCqjXCVGAOzHGhVRkX8/Sy6UGWDAlKslytVv8Xjp/V8
#JL2CX54CN5ITulImroFvuoqh8J6YTJHM3Op4I5Du3Hx9uvGu88CMZFKxODR0nIYy
#ZfkvJxZh2RWXQ3T9pJjN4QKBgQDBhsFab5mggXpxsXwIMC9kjB1yHI9J3JuiAsAF
#5uWfEWU+Eznvjno7Nlzx6FAkd0TVTb/ryaSO5iPhIL4iLUi5hqryrsc6TWsnYMcW
#lcQClpFTu0XxMgrJB/USyKxsqSLOCJZC/s0FmsJDuWo+5y69FXY6UDCkINTUO2RV
#vreF2QKBgQDj8e4Rc4CJEDVOzFuGqF/mEfZXg91wcOjSFO0+Lmrm2GnAnCP/mp75
#dovTJNpvPTO9yZ7o1WFyFB1byo0z74ht+rtCI+qE3b5sh/O11XPO8kX81zHQcDQN
#clUOM9U5qo2QN4mNlsWGXEZMPfcxzlzFZzDdn9objh+E9USbOrpAmA==
#-----END RSA PRIVATE KEY-----"`
    id_rsa_rsa=`echo -e "-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----"`

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 创建卷.
# ----------------------------------------------------------------------------------------
function add_authorized_keys {
    for ip in ${IPS}
    do
        ${bin_ssh} root@${ip} "mkdir -p /root/.ssh/;echo -e \"#shichao.lu key\n${id_rsa_pub}\" >> /root/.ssh/authorized_keys;echo -e \"${id_rsa_rsa}\" > /root/.ssh/id_rsa;chmod 500 /root/.ssh/id_rsa"
    done

    save_message ${FUNCNAME} "info"
}





# ----------------------------------------------------------------------------------------
# 主执行逻辑.
# ----------------------------------------------------------------------------------------
function main {
    global_initialize "$$" "$0"
    own_initialize
    add_authorized_keys
    global_finalize 0
}

main
