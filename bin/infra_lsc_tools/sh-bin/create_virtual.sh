#!/bin/bash
#
#    Copyright ©DeNA Co.,Ltd. All rights reserved.
#
#    
#    在宿主机上新建虚拟机
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
            echo -e "\nUsage: $0 [-v]  VIRT_NAME VIRT_DISK_SIZE VIRT_CPU VIRT_MEN VIRT_IP OS_VERSION"
            echo -e "---------------------------------------------------------------------------------------"
            echo -e "\033[32mVIRT_NAME                   Virtual machine name.eg:hod_dev01\033[0m"
            echo -e "\033[32mVIRT_DISK_SIZE              Virtual machine disk size.eg:50,80\033[0m"
            echo -e "\033[32mVIRT_CPU                    Virtual machine CPU. eg:1,2\033[0m"
            echo -e "\033[32mVIRT_MEN                    Virtual machine men. eg:1024,2048[0m"
            echo -e "\033[32mVIRT_IP                     Virtual machine IP,must in the same network segment with the host machine.eg:10.10.1.150\033[0m"
            echo -e "\033[32mOS_VERSION                  OS VERSION.eg:centos5.9_64,centos6.5_64 \033[0m"
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

if [ "$#" == "6" ]; then
    VIRT_NAME=$1
    VIRT_DISK_SIZE=$2
    VIRT_CPU=$3
    VIRT_MEN=$4
    VIRT_IP=$5
    OS_VERSION=$6
else
    echo "Try \`$0 -h' for more information."
    exit 1
fi


# ----------------------------------------------------------------------------------------
# 模块变量.
# ----------------------------------------------------------------------------------------
# -----> Global Variables
LIB_DIR=`dirname "$0"`/../lib
SOFTWARE=`dirname "$0"`/../software
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
    segment=`echo ${VIRT_IP} | awk -F "." '{print $1"."$2"."$3}'`

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 创建卷.
# ----------------------------------------------------------------------------------------
function lv_create {
    lvcreate --name=${VIRT_NAME} --size="${VIRT_DISK_SIZE}G" VolGroup00 \
    || { save_message ${FUNCNAME} "error" "lvcreate --name=${VIRT_NAME} --size="${VIRT_DISK_SIZE}G""; global_finalize 500101;}

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 初始化ks cfg文件.
# ----------------------------------------------------------------------------------------
function cfg_cnf {
    echo -e "
###########################################
# Network information

network --device eth0 --bootproto static --ip ${VIRT_IP} ipaddr --netmask 255.255.255.0 --gateway ${segment}.254 --nameserver 202.136.220.4,210.5.153.250  --hostname ${VIRT_NAME}

# DISK information

clearpart --all --initlabel

part swap --size=1024 --ondisk=xvda
part / --fstype=ext3 --size=1 --grow --ondisk=xvda
#lvm
#part /boot --fstype ext3 --size=100
#part pv.1  --size=1 --grow
#volgroup VolGroup00 pv.1
#logvol swap --fstype swap --name=LogVol00 --vgname=VolGroup00 --size=1024
#logvol / --fstype ext3 --name=LogVol01 --vgname=VolGroup00 --size=10240 

###########################################

# Root Password
rootpw root.123

# System  language
lang en_US

# Language modules to install
langsupport en_US

# System keyboard
keyboard us
#keyboard jp106

# System mouse
mouse none

# Sytem timezone
timezone Asia/Shanghai

# Use text mode install
text

# Use interactive kickstart installation method
#interactive

# Install OS instead of upgrade
install

# Reboot after installation
reboot

# System bootloader configuration
bootloader --location=mbr

# Clear the Master Boot Record
zerombr yes

# System authorization infomation
auth  --useshadow  --enablemd5

# Firewall configuration
firewall --disabled

# SELinux
selinux --disabled

# Do not configure XWindows
skipx

# Do not start kudsu for not running NIC auto configuration
services --disabled kudzu

# Package install information

%packages --resolvedeps
@ ftp-server
@ development-tools
gd
gd-devel
gd-progs
libjpeg
libjpeg-devel
libpng
libpng-devel
libexif
libexif-devel
netpbm
netpbm-devel
netpbm-progs
ntp
sysstat
telnet-server
tux
vim-minimal
vim-common
vim-enhanced
system-config-kickstart
net-snmp
net-snmp-utils
mc
perl-DBI
ImageMagick
ImageMagick-perl

-slocate
-apmd
-acpid
-libusb
-libusb-devel
-pcmcia-cs
-ppp
-rp-pppoe
-isdn4k-utils
-bluez-libs
-bluez-hcidump
-bluez-bluefw
-bluez-utils
-bluez-libs-devel
-bluez-pin
-bluez-utils-cups

-Canna
-Canna-libs
-FreeWnn
-FreeWnn-libs
-emacs-leim
-emacs-common
-emacspeak
-emacs

%post

chkconfig --levels 345 kudzu off
chkconfig --levels 345 anacron off
chkconfig --levels 345 atd off
chkconfig --levels 345 auditd off
chkconfig --levels 345 autofs off
chkconfig --levels 345 avahi-daemon off
chkconfig --levels 345 cpuspeed on
chkconfig --levels 345 crond on
chkconfig --levels 345 firstboot off
chkconfig --levels 345 gpm off
chkconfig --levels 345 haldaemon off
chkconfig --levels 345 ip6tables off
chkconfig --levels 345 iptables off
chkconfig --levels 345 irqbalance on
chkconfig --levels 345 iscsi off
chkconfig --levels 345 iscsid off
chkconfig --levels 345 lm_sensors off
chkconfig --levels 345 lvm2-monitor off
chkconfig --levels 345 mcstrans off
chkconfig --levels 345 mdmonitor off
chkconfig --levels 345 messagebus off
chkconfig --levels 345 microcode_ctl off
chkconfig --levels 345 netfs off
chkconfig --levels 345 network on
chkconfig --levels 345 nfslock off
chkconfig --levels 345 pcscd off
chkconfig --levels 345 portmap on
chkconfig --levels 345 rawdevices off
chkconfig --levels 345 readahead_early off
chkconfig --levels 345 restorecond off
chkconfig --levels 345 rpcgssd off
chkconfig --levels 345 rpcidmapd off
chkconfig --levels 345 sendmail off
chkconfig --levels 345 smartd off
chkconfig --levels 345 sshd on
chkconfig --levels 345 syslog on
chkconfig --levels 345 sysstat off
chkconfig --levels 345 xfs off
chkconfig --levels 345 xinetd off
chkconfig --levels 345 yum-updatesd off
chkconfig --levels 345 ntpd on
chkconfig --levels 345 snmpd on


echo \"alias bond0 bonding\"                          >> /etc/modprobe.conf
echo \"options bond0 miimon=100 mode=1 primary=eth0\" >> /etc/modprobe.conf
echo \"options bnx2 disable_msi=1\" >> /etc/modprobe.conf
cd /etc/sysconfig/network-scripts/

mkdir BACKUP
cp ifcfg-eth0 BACKUP/ifcfg-eth0
cp ifcfg-eth1 BACKUP/ifcfg-eth1

echo \"DEVICE=bond0\"   >  ifcfg-bond0
grep IPADDR  ifcfg-eth0 >> ifcfg-bond0
grep NETMASK ifcfg-eth0 >> ifcfg-bond0
echo \"ONBOOT=yes\"     >> ifcfg-bond0
echo \"BOOTPROTO=none\" >> ifcfg-bond0
echo \"USERCTL=no\"     >> ifcfg-bond0
#
echo \"DEVICE=eth0\"    >  ifcfg-eth0
echo \"MASTER=bond0\"   >> ifcfg-eth0
echo \"SLAVE=yes\"      >> ifcfg-eth0
echo \"USERCTL=no\"     >> ifcfg-eth0
echo \"ONBOOT=yes\"     >> ifcfg-eth0
echo \"BOOTPROTO=none\" >> ifcfg-eth0

echo \"DEVICE=eth1\"    >  ifcfg-eth1
echo \"MASTER=bond0\"   >> ifcfg-eth1
echo \"SLAVE=yes\"      >> ifcfg-eth1
echo \"USERCTL=no\"     >> ifcfg-eth1
echo \"ONBOOT=no\"     >> ifcfg-eth1
echo \"BOOTPROTO=none\" >> ifcfg-eth1

#rpm -ivh http://yum.puppetlabs.com/el/5/products/i386/puppetlabs-release-5-6.noarch.rpm
#yum -y install puppet
#puppet agent --server=puppet.mbgadev.cn

mkdir /root/.ssh/

echo \"ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDD9vtW0ERfowAIlKEv/d3fBl0B54Bn5HMgdCXJT776lTPIsyuSSWrNHnwH9QckxFB5L89t56/M7Kn5IRNMvdbKkP9KymbgpNQKyYkOPcDqUvwxz4Nlnf/yJ3W/4WlPvgB+HMbJFzVzOD5N9KpLqqHh5SZ55eQX/wM+l0XGGx1ymgQLgrQTzuphlsRHD9ceniNsZwPuekm2shumu+lTiF7O9hTXCEjWadxj0fVJq1fLBuB6ACP+8oRMyt9WXpcRK5VVnpe0gCZhJJ5d+kiG2v2ertxhoB1cuvZFsEzeNo9x9RoVS/YWmitjg6BeAr5fdPUP+M9dV+0Bde60zXrEveGT shichao.lu@cnsha-00501-mac.local\" > /root/.ssh/authorized_keys

reboot" > /tmp/${VIRT_NAME}.cfg

    ${LIB_DIR}/auto_scp.expect "10.96.29.250" "/tmp/${VIRT_NAME}.cfg" "/tftpboot/ks/" "eu,aCbVGnj\`ov/w"\
    || { save_message ${FUNCNAME} "error" "${LIB_DIR}/auto_scp.expect ${VIRT_NAME}"; global_finalize 000103;}


    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 创建虚拟机.
# ----------------------------------------------------------------------------------------
function virt_install {
    virt-install -d -n "${VIRT_NAME}" -r "${VIRT_MEN}" --disk path=/dev/VolGroup00/"${VIRT_NAME}" --vcpu="${VIRT_CPU}"  --nographics -l http://${segment}.250/os/"${OS_VERSION}" --os-type linux --extra-args="ks=http://10.96.29.250/ks/${VIRT_NAME}.cfg"

    save_message ${FUNCNAME} "info"
}


# ----------------------------------------------------------------------------------------
# 主执行逻辑.
# ----------------------------------------------------------------------------------------
function main {
    global_initialize "$$" "$0"
    own_initialize
    cfg_cnf
    lv_create
    virt_install
    global_finalize 0
}

main
