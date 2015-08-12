/**
* @class SchedulerAgent
*/

var base = require('../libs/app_base');
var main = require('./constructor');

var appMain = new main.Constructor('SA');
base.app(appMain);