/**
 * @class ServiceManager
 */

var base = require('../libs/app_base');
var main = require('./constructor');

var appMain = new main.Constructor('UD');
base.app(appMain);