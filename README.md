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


### 常用的npm

* async
* underscore
* dnode
* log4js
* mysql
* redis
* optimist
* mocha
* express
* crypto
* ini