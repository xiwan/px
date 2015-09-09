/**
* @class WebAgent
*/

var base = require('../libs/app_base');
var main = require('./constructor');

var appMain = new main.Constructor('WA');
base.app(appMain);