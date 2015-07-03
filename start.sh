mv ./nohup.out ./nohup.`date '+%j'`.bk

# nohup node ./ServiceManager/app.js --idx=901 --cfg=./cfg/config.ini &

node ./ServiceManager/app.js --idx=901 --cfg=./cfg/config.ini