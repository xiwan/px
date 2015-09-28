## Project X 服务器框架设计

### 背景介绍

这个项目主要综合了以前我所经历过的一些node的服务器经验，比如express, ngServer, pomelo等等。node作为脚本语言性质，决定了它不适合做高cpu的业务，不同于java之类采用的是单线程，多进程的模式来处理海量请求。每个进程其实和传统web服务器一样都是镜像一般处理相同业务（登录，聊天，战斗，交易等等），这样来做可以省去很多设计和编码上的麻烦。但经过许多次的项目告诉我，无差别的进程看似很简单，但埋下了很多隐患。

* 这种吃大锅饭的设计，让机器资源无法最优化使用。
* 一个进程有问题意味着所有的都有问题。
* 无法为单独业务做设计，一旦这么做了，相当于打破了之前的原则。
* 每次的更新迭代意味着全包更新。

在游戏服务器端，往往需要处理大量的各种各样的任务，比如：管理客户端的连接，维护游戏世界端状态，执行游戏的逻辑等等。每一项任务所需的系统资源也可能不同，如：IO密集或CPU密集等。而这些复杂的任务只用一个单独的服务器进程是很难支撑和管理起来的。所以，游戏服务器往往是由多个类型的服务器进程组成的集群。每个服务器进程专注于一块具体的服务功能，如：连接服务，场景服务，聊天服务等。这些服务器进程相互协作，对外提供完整的游戏服务。

一般来说网络游戏服务器需要实现以下功能（可能不完全）

* 网络
  	* request/response
	* RPC
	* broadcast/channel
	* session	
* 服务器管理
	* 可配置扩展 (xls,json格式)
	* console (进程创建，管理和监控)	
	* 版本管理
* 数据库
	* schema设计
	* model层
	* master data
	* 缓存
* 支持
	* 脚本, 工具
	* 定时任务
	* 安全，错误
* 业务
	* 聊天室
	* 支持多服，合服，跨服
	* 运营工具
	

#### 服务器类型

projecX服务器一般把服务按照服务功能做了如下区分：

* **service master** 总管理进程。这是所有其他进程运行的基础，负责其他进程的管理和监控。生产环境中需要每台机器上跑一个。
* **sesssion server** 代理进程。顾名思义，用于管理用户session（连接）的进程，处理请求的转发等等.是后端服务器与客户端之间沟通的桥梁，可以认为是一个高级的前端服务器。
* **unite defense** 用户进程。主要业务逻辑处理的后端服务器。其实这里还可以做更细化的业务区分：战斗(pvp, pve, raidBoss)，排行榜，商店，gacha, 聊天，邮件
* **agent scheduler** 定时器进程。用来处理服务器的定时任务。
* **game log** 日志进程。搜集服务器产生的所有日志。
* **web agent** 运营工具。


### 服务器管理

projectX服务器提供了一系列强大的后台管理工具，主要有监测所有进程状态；进程的启动，关闭；进程模块代码生成等等。

首先启动整个项目的命令为：

	// 启动进程管理容器(tcp服务器)，备份上次日志，并按照daemon模式运行在后台
	sh start.sh -on

![start sm](https://cloud.githubusercontent.com/assets/931632/8846865/adbf571c-315c-11e5-8e7c-b9c1ca2cbb2e.png)

可以看到默认tcp服务器是启动在 6001端口的。

	// 然后可以登录上该服务器进行必要操作.
	telnet localhost 6001
	
#### 启动／关闭进程命令
* start process all
* start process wa
* start process wa 961

后面两个是启动某一类进程或者某个进程命令，start可以替换为stop

	SM.901 0.0.0.0:6001 $ start process all
	NAME IDX  RESULT                   
	SS   201  success                  
	SS   202  success                  
	UD   501  success                  
	UD   502  success                  
	WA   961  success 
	
#### 查看进程状态命令

**get process-status** 获取当前正在运行进程状态，默认60秒刷新一次 
 
	SM.901 0.0.0.0:6001 $ get process-status
	PID       NAME IDX  TIME                       CPU       MEMORY       
	28743     SS   201  Thu Jul 23 2015 17:07:23   0.7 %     0.3%(27MB)   
	28744     SS   202  Thu Jul 23 2015 17:07:23   0.7 %     0.3%(27MB)   
	28745     UD   501  Thu Jul 23 2015 17:07:23   0.8 %     0.4%(30MB)   
	28746     UD   502  Thu Jul 23 2015 17:07:23   0.9 %     0.4%(31MB)   
	28739     SM   901  Thu Jul 23 2015 17:07:13   0 %       0.4%(29MB)   
	28747     WA   961  Thu Jul 23 2015 17:07:23   0.7 %     0.3%(26MB)  

#### 建立新的任务模块
每一个任务模块代表相同业务逻辑单元的聚合。比如说游戏中我们会有专门处理连接请求的模块(SS)，用户逻辑的模块(UD),管理后台的模块(WA)等等。至于如何聚合这些业务逻辑可以取决于开发者的思考。你可以按照前面的约定这样分类，也可以把所有的业务放在一个任务模块中。这些模块会以独立进程的形式运行在配置的服务器上面，十分容易扩展和管理。

任务模块的配置信息在config.ini中

	; services configuration block
	[services]
	monitorInterval = 6000 			//监控间隔

	[services.SS]
	disable							//暂停使用标志
	name = SessionServer			//模块全称
	service = SS					//模块缩写
	machines[] = localhost:201 		//模块启动位置+idx
	machines[] = localhost:202

	[services.SS.rpc]				
	server							//rpc服务器标志，默认true
	client[] = UD					//rpc客户端

如果后面我们配置了新的模块，如下：

	[services.WA]
	name = WebAgent
	service = WA
	machines[] = localhost:961

	[services.WA.rpc]
	server
	client[] = UD

执行 **build** 命令，已经存在的进程模块是不会重新build的：

	SM.901 0.0.0.0:6001 $ build all
	EEXIST, file already exists './SessionServer'
	EEXIST, file already exists './UnitDefense'
	It's saved! WebAgent

这样我们可以可以看到工程中就会有一个新文件夹 **WebAgent**, 并且初始化好了所需要的三个文件app.js, commands.js, constructor.js.

![webagent module](https://cloud.githubusercontent.com/assets/931632/8847276/f1aff5aa-315f-11e5-89af-37a85339a9d2.png)

基本上所有的任务模块都包含了这三个文件。

* app.js 模块运行部分
* commands.js 模块handler部分
* constructor.js 模块初始化和主要业务逻辑部分。

###资源

游戏中涉及到的资源一般有几种：声音，图片，AssetBuddle, 脚本，核心数据等等。首先，这些资源会统一存放在cdn服务器中，通过日期或者版本号之类命名规则来进行区别。并且在projectX中进行了部分整合，脚本会按照核心数据的组成部分打入到核心包中，声音和图片会打入AssetBuddle中，但这里要注意的是运营部分的图片还是会分开独立存放的。

这样对于核心数据的生成会是这样一个流程：策划在xls中配置好游戏的核心数据（包括脚本），通过后台提供的接口上传到目标服务器，然后开始进行转换，生成json／sqlite文件；其中json是给服务器端用，sqlite会继续上传到cdn服务器上提供给客户端更新用。

AssetBuddle和图片等其他不需要加工的资源可以通过ftp直接放置在cdn服务器对应的目录中即可。

![webagent module](https://cloud.githubusercontent.com/assets/931632/9538030/9370d14c-4d72-11e5-8ef8-0801679efa99.png)


####什么时候更新资源呢？

当资源准备好后，什么时候更新资源呢？

projectX做法是要求客户端每次登陆游戏的时候带着当前版本号vid和服务器的进行比对，如果客户端的小于服务器的版本号，那么客户端将进入下载资源的流程，并且更新他本地的vid；如果用户在游戏中，服务器对核心数据进行了版本升级，同里，由于每个http请求都有vid，这样可以在任何节点进行更新操作，然后客户端重新登录游戏即可。

####更新哪些资源呢？

进一步来说，由于每次改动可多可少，客户端进行全量更新比较保险但会照成很多浪费。projectX会采用差量更新的方案。在服务器每次生成新的核心数据同时，会生成一份本次改动的列表。当客户端需要进行更新操作时候，先获取这份列表，只下载列表上对应的资源文件即可。

下载完成之后客户端还需要对每个文件做一次crc校验，保证文件的完整性。


### 底层设计

#### request & response

###### 路由router
对于不同的请求，需要有不同handler来处理。路由的配置主要在commands.js中完成，一个例子：

	module.exports = {
		'iNone' : ['ClientLogin'],
		'iAuth' : ['UserSocketLogin', 'JoinChannel', 'SendChattingMsg', 'RecvChannelMsg', 'HeartBeat'],
		'iPass' : ['test1', 'testABC'],
		'iUser' : ['StartScene'],
	};
	
在这个对象中，key值是过滤器，也是下面谈到的策略policy。后面数组中的就是一个一个的具体handler.

###### policy

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

###### response
返回的数据根据是http或者socket会略有不同，但都会进行一个加密过程base64+zip，同里客户端需要进行解密才能处理返回数据。

#### rpc
想进行rpc调用，可以通过constructor的两个方法：getService(单个)或者getServiceList（多个）来实现：

		var services = global.base.getServiceList('SS');
		services.forEach(function(service){
			service.requestAction('notifyUsers', data, function(){});
		});

#### broadcast & channel

projectX设计有三类channel: pub， clan，和friends。代表了三种不同的粒度。

* pub主要负责广播全局的消息。
* clan是负责工会内部消息，比如成员的变动。
* friends是负责好友动态的更新。

每个独立用户登录游戏后需要socketLogin，生成socket, 这个是通讯的基础。然后再joinChannel，把socket加入到各个不同的channel中。通常来说pub是每一个用户都需要加入的，clan和friends则是玩家需要达成一定条件才可以加入的channel。

这些不同的channel设计原理其实是一样的，通过redis的pub/sub机制来实现跨进程的广播。

#### session
用来保持客户端与服务器的会话,当用户成功登陆后，session创建成功会返回一个唯一的appsessionKey,这个key是以后客户端与服务器通信的必要参数。如果它一旦过期则会要求客户端重新登录来获取新的appsessionKey.

通常的一个session结构有：
	var session = {
		key : uuid.v1(),
		deviceId : message.deviceId,
		dataVersion : message.dataVersion,
		hosts : client.hosts,
		market : message.market,
		os : message.os,
		date : new Date(),
        uid : __.random(1, 1000),
        wid : 0,
	};

#### model

#### construtor
Constructor是所有其他进程的父类。提供了供子类访问的各种对象和方法。

init方法由Constructor本身管理。负责获取命令行启动参数，配置数据。然后初始化Logger， Redis，并最后兼听当前process状态.

run方法由各个子process管理，不同角色的子process会有不同的运行方案。如果是frontend主要是建立proxyServer和rpc模块；如果是backend则主要是rpc模块和业务逻辑

#### redis
对于缓存部分，redis通过读取配置文件config.ini在constructor中初始化。

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


#### proxyServer

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


### 数据库部分

#### read/write 分离

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

#### 数据库连接设置表

如下图所示，对于新的项目，开发者无须手写sql,只需要通过xlsx的配置就可以达到相同效果。具体存放xls的目录地址为__cfg/schema/systems.xlsx__。

![system xlsx](https://cloud.githubusercontent.com/assets/931632/8695649/f653982a-2b18-11e5-869e-f6a15b0d6337.png)

重要的几个配置字段

* Name: 数据库名称
* Host: 数据库地址
* User: 数据库用户
* Password: 数据库密码


#### 数据库关系配置表

接下来可以在同目录下建立另外一个xlxs,由于mysql是关系型数据库，除了配置数据库内的tables，各个table之间关系也很重要.对于游戏来说更是如此。游戏具有很强的用户中心特性，所以设计用户表格时候都可以以用户uid为主键的设计。那么会有一些列这样的表格。如何管理这些表格呢？可以通过xlsx的配置来达到。

![relation xlsx](https://cloud.githubusercontent.com/assets/931632/8744333/f83c3778-2ca8-11e5-9685-29d1e38bb674.png)

重要的几个配置字段

* Domain: 一组具有强关系的表集合会共享相同的Domain
* Name: 该表格在层级中的alias
* TableName: 表格在数据库内真实的名字
* Hierachy: 表明层级关系. 如果是空是最底层，base表示某个子Domain的中心节点
* PartitionKey: 表分区采用的键,默认是hash分区
* PartitionNum: hash分区个数
* PartitionBy: 分区类型LIST | RANGE | HASH

在这里的Hierachy是比较重要的，同一个Domain下面的表格是可以被base类全部找出(比如Account)。同理，characters作为base可以查出所有Hierachy为它的表格数据。通过这种层级关系,只要知道uid,就可以迅速查找出某个玩家的所有或者某个方面的数据.

#### 数据库表格设计

下图是account_character表格的设计，由于它在hierachy中是account层级下面的一个base，那么除了uid以外还需要charGid来做联合主键.同理其他的base类也都需要一个联合主键。对于character下面的表格，则需要第三个键来做联合主键(uid, charGid, xxxx)。

![schema xlsx](https://cloud.githubusercontent.com/assets/931632/8744850/1af9c948-2cad-11e5-8b1e-9fedd91cce25.png)

#### 执行

当以上配置完毕后，基本一个很清晰的数据库关系模型就建立起来了。在主键的基础上，各个字段都是为业务服务而已。接下来只需要执行:

	sh start -db // 初始化数据库命令
	
执行以上命令后会自动在目标服务器内建立配置数据库。当数据库建立完毕后，会查询同目录下Name对应的数据库schema设计。比如game_system_test.xlsx。

### sql Builder

对于node来说方便的sql管理是十分重要的。一般的写法都是把sql与逻辑代码混淆在一起，这样给工程维护带来了难度；第二种方案是引入第三方的npm包，把复杂的sql抽象成js对象，这个本身是无可厚非的，但增加了一定的学习成本。projectX采用了一个折中的方案：集中管理sql。

我们在模块下面建立文件sqls.js，它就是这个模块所有sql存放的地方。下面是两个例子
	
	var util = require('util');

	module.exports = {
		// 简单的sql链接
		getVersionsFromDB : function(appId){
        	var iQry = [];
        	iQry.push('select x.sheet, x.category, y.version, y.json, y.crc, x.excel as name, y.date from T_APP_DATA x');
        	iQry.push('join (select * from T_APP_DATA_VERSION) y');
        	iQry.push('on (x.appId = y.appId and x.sheet = y.sheet and x.maxVersion = y.version)');
        	iQry.push(util.format('where x.appId = "%s"', appId));
        	return iQry.join(' ');
		},
		
		// 或者利用对象来构建sql
		ApiApplyTables_instertAppData : function(appId, key, excel, category, version) {
			return {
            	sql : 'INSERT INTO T_APP_DATA SET ?',
            	data : {
                	appId : appId,
                	sheet : key,
                	excel : excel,
                	category : category,
                	maxVersion : version
            	}
        	}
		},
		...
	};

然后在需要调用sql的地方：
	
	// global.base.sqls在constructor中
	global.base.sqls.ApiApplyTables_instertAppData(global.const.appId, key, iFile.excel, category, version)

### 如何发布
	
#### 打包项目工程

	sh start.sh -tar // 打包项目文件

执行以上命令后会根据当前时间生成对应的tgz压缩文件。这个文件通过后台运营工具上传到发布机上进行解压和同步。

### 功能设计

#### 登陆功能
任何一款游戏都有登陆部分，projectX同样如此。下面是一个登陆游戏服务器基本的一些请求（补充中）

	1. EFClientLogin 		//客户端登陆游戏服务器，检查客户端版本及其他设置，生成session
	2. EFCheckTableCrc		//crc校验客户端master data
	3. EFUserLogin			//注册游戏内账号或者登陆游戏内已由账号
	4. EFGetUserData		//获取游戏账号用户数据
	5. EFUpdateNick			//更新玩家昵称
	6. EFUserSocketLogin	//websocket请求登陆
	7. EFJoinChannel 		//加入channel

#### 多人战斗pvp

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