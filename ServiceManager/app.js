/**
 * @class ServiceManager
 */

var base = require('../libs/app_base');
var main = require('./constructor');

var appMain = new main.Constructor('SM');
base.app(appMain);
