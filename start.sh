#!bin/bash

basePath=`pwd`
binPath="$basePath/bin"
config="$basePath/cfg"
logPath="$basePath/logs"
tgzPath="$basePath/tgz"
dbhost="localhost"
apphost="localhost"
configFile="config.ini"

help_info(){
	echo "NAME"
	echo "\t$0" 
	echo "SYNOPSIS"
	echo "\t$0 is a shell program for centralization H.O.D control"
	echo "DESCRIPTION"
	echo "\t -db: prepare local db..."
	echo "\t -rdb: prepare remote db..."
	echo "\t -redis: start redis..."
	echo "\t -dev: link resources in dev mode..."
	echo "\t -pod: link resources in pod mode..."
	echo "\t -sync: sync framework resources..."
	echo "\t -on: start local sm process..."
	echo "\t -off: stop local sm process..."
	echo "\t -ron: start remote sm processes..."
	echo "\t -roff: stop remote sm processes..."
}

contains() {
    string="$1"
    substring="$2"
    if test "${string#*$substring}" != "$string"
    then
        return 0    # $substring is in $string
    else
        return 1    # $substring is not in $string
    fi
}

initRedis() {
	if [ ! -e "$config/redis/redisSystem" ]; then
	  	mkdir "$config/redis/redisSystem"
	fi
	cd "$config/redis/redisSystem"
	redis-server "$config/redis/redis.conf" --port 16101

	if [ ! -e "$config/redis/redisSession1" ]; then
	  	mkdir "$config/redis/redisSession1"
	fi
	cd "$config/redis/redisSession1"
	redis-server "$config/redis/redis.conf" --port 16201

	if [ ! -e "$config/redis/redisSession2" ]; then
	  	mkdir "$config/redis/redisSession2"
	fi
	cd "$config/redis/redisSession2"
	redis-server "$config/redis/redis.conf" --port 16202

	if [ ! -e "$config/redis/redisMessage" ]; then
	  	mkdir "$config/redis/redisMessage"
	fi
	cd "$config/redis/redisMessage"
	redis-server "$config/redis/redis.conf" --port 16301

	if [ ! -e "$config/redis/redisChannel1" ]; then
	  	mkdir "$config/redis/redisChannel1"
	fi
	cd "$config/redis/redisChannel1"
	redis-server "$config/redis/redis.conf" --port 16401

	if [ ! -e "$config/redis/redisChannel2" ]; then
	  	mkdir "$config/redis/redisChannel2"
	fi
	cd "$config/redis/redisChannel2"
	redis-server "$config/redis/redis.conf" --port 16402

	cd $basePath
}


if [ $# -eq 0 ]
then
	help_info
	exit 0
fi

while [ -n "$1" ]
do 
case "$1" in
	-on )
		mv $basePath/logs/nohup.out $basePath/logs/nohup.`date '+%j'`.bk
		
		if [[ -z $mod ]] || [[ $mod != 'pod' ]] ; then
			mod='dev'
		fi

		# nohup node ./ServiceManager/app.js --idx=901 --cfg=$basePath/tgz/cfg/config.ini > "$basePath/logs/nohup.out" &
		# node ./ServiceManager/app.js --idx=901 --cfg=$basePath/cfg/config.ini
		
		if [[ $mod == 'pod' ]] ; then
			re='^[0-9]+$'
			if ! [[ $packnumber =~ $re ]] ; then
				packnumber="`mysql -u root -h $dbhost -p'pa$$w0rd' -N  -e "SELECT deployVersion FROM test_game_system.t_app_base"`"
			fi
			echo "pack number is : $packnumber"

			if [ ! -e "$basePath/tgz/$packnumber" ] ; then
				echo "not find packnumber : $packnumber"
			  	exit 1
			fi
			echo "set sm on server: ".`hostname`." mod: $mod"
			nohup node $basePath/tgz/$packnumber/ServiceManager/app.js --idx=901 --cfg=$basePath/tgz/$packnumber/cfg/config.ini &
		else 
			echo "set sm on server: ".`hostname`." mod: $mod"
			node ./ServiceManager/app.js --idx=901 --cfg=./cfg/config.ini
		fi
		;;

	-off )
		echo "set sm off server: ".`hostname`
		killall node
		;;
	-tar )
		tarName=`date +"%Y%m%d%H%m"`
		gnutar cvfz "$tgzPath/$tarName.tgz" --exclude=node_modules --exclude=tgz --exclude=logs * > "$logPath/$tarName.log"
		echo "tar output : $tarName"
		;;
	-redis )
		initRedis
		;;
	-db )
		cd $binPath
		node mysql_init_database.js
		node mysql_init_schema.js
		cd $basePath
		;;
esac
shift
done

