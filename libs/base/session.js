'use strict';

var uuid = require('node-uuid');
var __ = require('underscore');

var Session = exports.Session = function() {};

Session.prototype.createSession = function(message, cb) {
	var client = global.base.redis.session.get(message.deviceId);
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
	var encrypt = global.utils.encrypt(JSON.stringify(session), 'session');

	client.set(session.key, session, global.const.SESSION_TTL, function(err){
		cb(err, encrypt);
	});
};

Session.prototype.get = function(encrypt, cb) {
    var decrypt = JSON.parse(global.utils.decrypt(encrypt, 'session'));
    // var iGrp = global.base.dataGrp.getDataGroup(decrypt.market);
    // if (iGrp.version !== decrypt.dataVersion)
    //     throw new Error('__table_version');
    // if (decrypt.clientVersion < iGrp.getClientVersion())
    //     throw new Error('__client_version');

    var client = global.base.redis.session.getByNode(decrypt.hosts);

    client.get(decrypt.key, global.const.SESSION_TTL, function(err, session) {
        (err && err.message === '__not_existed_key') && (err = new Error('__expired_session'));
        cb(err, session);
    });
};

Session.prototype.set = function(session, data, cb) {
    var client = global.base.redis.session.getByNode(session.hosts);

    var keys = Object.keys(data);
    keys.forEach(function(key) {
        session[key] = data[key];
    });

    client.set(session.key, session, global.const.SESSION_TTL, cb);
};

Session.prototype.del = function(session) {
    var client = global.redis.session.getByNode(session.hosts);

    client.del(session.key, function(err) {
        err && global.warn('session.client.del. key:%s, err:%s', session.key, err.message);
        session = null;
    });
};


exports.createObject = function() {
    return new Session();
};