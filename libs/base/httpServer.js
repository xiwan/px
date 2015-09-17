'use strict';

var fs = require('fs');
var util = require('util');
var union = require('union');
var ecstatic = require('ecstatic');
var director = require('director');

var HttpServer = function(options, portNo) {
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
	        	global.debug('starting up http-server, serving ' + '/public' + ' on port: ' + portNo.toString());
		    },
        ]),
        headers: this.headers || {}
    }).listen(portNo);

};

HttpServer.prototype.listen = function () {
    this.server.listen.apply(this.server, arguments);
};

HttpServer.prototype.close = function () {
    return this.server.close();
};

exports.createServer = function (options, portNo) {
    return new HttpServer(options, portNo);
};