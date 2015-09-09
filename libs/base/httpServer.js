'use strict';

var fs = require('fs'),
    util = require('util'),
    union = require('union'),
    ecstatic = require('ecstatic');

var HttpServer = function(options) {
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

    this.server = union.createServer({
    	before: (options.before || []).concat([
            ecstatic({
                root: this.root,
                cache: this.cache,
                showDir : this.showDir,
                autoIndex: this.autoIndex,
                defaultExt: this.ext
            })
        ]),
        headers: this.headers || {}
    });

};

HttpServer.prototype.listen = function () {
    this.server.listen.apply(this.server, arguments);
};

HttpServer.prototype.close = function () {
    return this.server.close();
};

exports.createServer = function (options) {
    return new HttpServer(options);
};