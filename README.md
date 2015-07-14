## Project X 服务器框架设计

### 背景介绍

在游戏服务器端，往往需要处理大量的各种各样的任务，比如：管理客户端的连接，维护游戏世界端状态，执行游戏的逻辑等等。每一项任务所需的系统资源也可能不同，如：IO密集或CPU密集等。而这些复杂的任务只用一个单独的服务器进程是很难支撑和管理起来的。所以，游戏服务器往往是由多个类型的服务器进程组成的集群。每个服务器进程专注于一块具体的服务功能，如：连接服务，场景服务，聊天服务等。这些服务器进程相互协作，对外提供完整的游戏服务。

一般来说网络游戏服务器需要实现以下功能（可能不完全）

* 网络
  	* request/response
	* broadcast/channel
	* RPC
	* session	
* 服务器管理
	* 可配置扩展 (xls,json格式)
	* console (进程创建，管理和监控)	
* 其他
	* master data管理
	* 支持多服，合服，跨服
	* 数据库连接
	* 定时任务
	* 游戏KPI数据(RR1,RR3)
	* 运营工具
	

### 服务器类型

服务器一般分为frontend和backend。frontend负责承载客户端的连接，与客户端之间的所有请求和响应包都会经过frontend。同时，frontend也负责维护客户端session并把请求路由给后端的backend服务器。Backend则负责接收frontend分发过来的请求，实现具体的游戏逻辑，并把消息回推给frontend，再最终发送给客户端。

![Server Type](https://camo.githubusercontent.com/5935f0403ef84c20197af32d6ca0d86069c742b3/687474703a2f2f706f6d656c6f2e6e6574656173652e636f6d2f7265736f757263652f646f63756d656e74496d6167652f7365727665722d747970652e706e67)

### read/write 分离

配置在config.ini中，读写分离的主要目的是为了减轻数据库的压力。主从两库的同步主要通过mysql replica机制来达到。

下面是一个配置mysql部分的片段

	[mysql]
	database = systemDB					//指定默认链接的数据库

	[mysql.master]						//master信息，master一般只有一个
	host = localhost
	port = 3306

	[mysql.slave] 						//slave信息,可以支持多个
	conn[] = localhost:3307
	conn[] = localhost:3308

	[mysql.systemDB] 					//某个DB的配置信息
	user = gameAdmin					//用户名
	password = admin00!!				//密码
	database = game_system				//数据库真实名称
			
	[mysql.platformDB]					//第二个DB的配置信息
	user = gameAdmin
	password = admin00!!
	database = platform_service

如何连接一个数据库？首先需要在model层中引入mysqlConn类:

	var mConn = require('./libs/base/mysqlConn');
调用构造函数:
	
	// 如果未设置第二个参数(目标数据库)，则使用默认数据库连接
	self.mConn = mConn.createObject(global.base.cfg.mysql, 'platformDB');

使用master或者slave:
	
	self.mConn.use('slave');
执行单条活着多条sql:

	var qryList = [];
    qryList.push({ sql : 'SELECT * FROM T_APP_BASE where appId = ?', data : [global.const.appId] });
	self.mConn.execute(qryList, cb);
	
### 模块设计

#### model模块

#### construtor模块
Constructor是所有其他进程的父类。提供了供子类访问的各种对象和方法。

init方法由Constructor本身管理。负责获取命令行启动参数，配置数据。然后初始化Logger， Redis，并最后兼听当前process状态.

run方法由各个子process管理，不同角色的子process会有不同的运行方案。如果是frontend主要是建立proxyServer和rpc模块；如果是backend则主要是rpc模块和业务逻辑

#### redis模块
对于缓存部分，redis模块通过读取配置文件config.ini在constructor中初始化。

redis server安装好以后，通过 

		sh start.sh -redis
启动redis client。根据配置来说，有可能我们会有多个redis server情况,比如：

	1735293225 49869     1   0 Tue12PM ??         1:34.73 redis-server *:16101   
	1735293225 49872     1   0 Tue12PM ??         1:33.97 redis-server *:16201   
	1735293225 49875     1   0 Tue12PM ??         1:33.80 redis-server *:16202   
	1735293225 49878     1   0 Tue12PM ??         1:33.88 redis-server *:16301   
	1735293225 49881     1   0 Tue12PM ??         1:33.49 redis-server *:16401   
	1735293225 49884     1   0 Tue12PM ??         1:34.00 redis-server *:16402 

这个时候对于同一个session，需要将其请求转到同一个redis，否则缓存则会失效。
redis模块采用了`constant hashing`算法(hashring模块)来达到上述目的。其基本思路就是每次node的增加和删除在平均情况下只会导致K/n个hash结果重新映射(K是hash的key值，n是node数目)；而不是大量的重新映射导致缓存的失败。

这样开发者要做的其实就很简单了：保证传入hash值的稳定性。常见的做法就是通过session提取出uid。这样就可以保证玩家每次的请求都在固定的node上被响应。

#### policy模块

对于服务器来说，无论是何种请求，采用何种对应的策略(policy)处理该请求是关键。这里的策略(policy)可以理解为多个过滤器(Filter)。

		// init policy instance & load commands
		var policy = base.Policy.createObject();
		var policy.loadPolicy(self, commands);
		
policy模块主要是通过预定义和自定义两种相结合的方案。

预定义好的策略主要有

* iNone: 不需要认证，也没有rpc请求。 比如非关键资源请求
* iPass: 不需要认证，但有rpc请求。 比如非关键资源请求
* iAuth: 需要认证，但没有rpc请求。 比如session的检查
* iUser: 需要认证，并且会有rpc请求。比如请求成为游戏内的好友

下面是一个例子：

		module.exports = {
			'iUser': ['reqAskForFriend', 'reqGetItem'],
			'iAuth': ['reqCheckSession'],
			'iNone': ['reqUserLogin'],
			'iPass': ['reqPlatFormLogin']
		};

关于自定义策略，这个十分开放，开发者可以在每个子Constructor类中完成。

policy类继承于`EventEmitter`, 监听下面几个事件

* message: 主要是用于处理http或者websocket请求过来的事件
* requestAction:
* requestMessage:

#### proxyServer模块

proxyServer模块主要是提供了一个类似connector的解决方案。它既可以是一个http服务器也可以是一个websocket服务器。

作为一个http服务器，proxyServer只能监听__message__事件。并且把处理的事务托管给policy模块来完成.

		// this is proxyServer sample
		var portNo = 123456;
		var proxy = base.ProxyServer(portNo, { protocol:'http' });
		var proxy.on('message', function(client, message, cb){ 
			policy.emit('message', client, message, cb); 
		});
		
在http服务器建立好的同时，websocket服务器也创建好了。它同样会把处理的事务托管给policy模块来完成.websocket服务器目前不接受binary格式数据，必须是可以json化的字符串。其body格式要求如下:

		var message = {
			name : action, // 请求对应handler
			json : JSON.stringify(iMsg) // protocol部分
		};
		
在Intel 4cpu 2.1Ghz, 4G Mem机器上, websocket benchmark部分结果(有rpc转发情况下):
		
		// client number: 100; concurrency: 10; message size: 10; roundtrip: 5
		Min: 49ms
		Mean: 68.42ms
		Max: 284ms
		// client number: 100; concurrency: 10; message size: 100; roundtrip: 5
		Min: 41ms
		Mean: 109.32ms
		Max: 1237ms
		// client number: 1000; concurrency: 10; message size: 10; roundtrip: 5
		Min: 37ms
		Mean: 85.252ms
		Max: 1409ms
		// client number: 1000; concurrency: 100; message size: 10; roundtrip: 5
		Min: 97ms
		Mean: 1307.026ms
		Max: 5459ms

### 功能设计

#### 登陆功能
任何一款游戏都有登陆部分，projectX同样如此。下面是一个登陆游戏服务器基本的一些请求（补充中）

	1. EFClientLogin 		//客户端登陆游戏服务器，检查客户端版本及其他设置，生成session
	2. EFCheckTableCrc		//crc校验客户端master data
	3. EFUserLogin			//注册游戏内账号或者登陆游戏内已由账号
	4. EFGetUserData		//获取游戏账号用户数据
	5. EFUpdateNick			//更新玩家昵称
	6. EFUserSocketLogin	//websocket请求登陆

### 常用的npm

* async
* underscore
* dnode
* log4js
* [mysql 2.7.0](https://github.com/felixge/node-mysq)
* redis
* optimist
* mocha
* express
* crypto
* ini
* [websocket-benchmark](https://github.com/cargomedia/websocket-benchmark) 
* [ws](https://github.com/websockets/ws)