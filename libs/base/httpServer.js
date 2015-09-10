'use strict';

var fs = require('fs');
var util = require('util');
var union = require('union');
var ecstatic = require('ecstatic');
var director = require('director');

var HttpServer = function(options, router) {
	var self = this;
	options = options || {};

	if (options.root) {
		this.root = options.root;
	}else {
		try {
            fs.lstatSync(process.env.PWD + '/WebAgent/public');
            this.root = process.env.PWD + '/WebAgent/public';
		}catch (err) {
			this.root = './'
		}
	}

    if (options.headers) {
        this.headers = options.headers;
    }

    this.cache = options.cache || 3600; // in seconds.
    this.showDir = options.showDir !== 'false';
    this.autoIndex = options.autoIndex !== 'false';

    if (options.ext) {
        this.ext = options.ext === true ? 'html' : options.ext;
    }
    // var router = new director.http.Router();
    this.server = union.createServer({
    	before: (options.before || []).concat([
            ecstatic({
                root: this.root,
                cache: this.cache,
                showDir : this.showDir,
                autoIndex: this.autoIndex,
                defaultExt: this.ext
            }),
		    function (req, res) {
		      	var found = router.dispatch(req, res);
		      	if (!found) {
		        	res.emit('next');
		      	}
		    }
        ]),
        headers: this.headers || {}
    });

 //    router.get('*', function () {
	//   	self.doAction('post', this.req, this.res);
	// });

};

HttpServer.prototype.listen = function () {
    this.server.listen.apply(this.server, arguments);
};

HttpServer.prototype.close = function () {
    return this.server.close();
};

HttpServer.prototype.doAction = function(method, req, res) {
    var self = this;
    try {
        var name = req.url.replace('/', '');
       	res.writeHead(200, { 'Content-Type': 'text/plain' })
       	res.end( name);
    } catch (ex) {
        global.warn('HttpServer.doAction. url:%s, error:%s', req.url, ex.message);
        console.log(ex.stack);
    };
}

exports.createServer = function (options, router) {
    return new HttpServer(options, router);
};