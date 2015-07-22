/**
 * @class SessionService
 */

var base = require('../libs/app_base');
var main = require('./constructor');

var appMain = new main.Constructor('SS');
base.app(appMain);