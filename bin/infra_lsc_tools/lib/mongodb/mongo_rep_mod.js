rep_conf={\"_id\":\"${rep_key}\",
             \"members\":
                [
                  {\"_id\":1,
                   \"host\":\"${master_ip}:27017\",
                   \"priority\":50},
                  {\"_id\":2,
                   \"host\":\"${slave1_ip}:37017\",
                   \"priority\":30},
                  {\"_id\":3,
                   \"host\":\"${slave2_ip}:37017\",
                   \"priority\":20}
                ]
            }
rs.initiate(rep_conf);
db.getMongo().setSlaveOk();


[{\\"_id\\":1,\\"host\\":\\"${master_ip}:27017\\",\\"priority\\":50},{\\"_id\\":2,\\"host\\":\\"${slave1_ip}:37017\\",\\"priority\\":30},{\\"_id\\":3,\\"host\\":\\"${slave2_ip}:37017\\",\\"priority\\":20}]\"