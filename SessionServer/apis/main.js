'use strict';

var apis = exports.apis = {};

// client login: create session for client
apis.EFClientLogin = function(protocol, cb){
	var self = this;
	try {
		var market = global.const.pMarket[protocol.market];
		protocol.clientVersion || (protocol.clientVersion = 100);
	    if (typeof(market) !== 'string' ||
	        typeof(protocol.deviceId) !== 'string' ||
	        typeof(protocol.clientVersion) !== 'number')
	        throw new Error('__invalid_param');

	   	protocol.market = market;

	    self.policy.session.createSession(protocol, function(err, key){
            cb(err, {
                result : 'success',
                appSessionKey : key,
                dataVersion : protocol.clientVersion
            });
	    });

	}catch (ex) {
		cb(ex)
	}
};


// user login: generate uid, add more info to session
apis.EFUserLogin = function(protocol, cb) {

};

// check crc: verify clients master data
apis.EFCheckTableCrc = function(protocol, cb) {

};

apis.EFUserSocketLogin = function(socket, protocol, cb) {
	var self = this;
	try {
		var session = protocol.__session;
        if (session.deviceId !== protocol.deviceId)
            throw new Error('__invalid_param');

        clearTimeout(socket.__timeId);
        delete socket.__timeId;
        socket.__appSessionKey = protocol.appSessionKey;
        socket.__channel = {};
        socket.__uid = session.uid;
        global.base.users[session.uid] = socket;
        cb(null, { result : 'success' });

	}catch (ex) {
		cb(ex)
	}
};


apis.EFHeartBeat = function(socket, protocol, cb) {
	var now = new Date();
	var session = protocol.__session;
        // socket redirection..
        cb(null, { result : 'success', serverTime : now });
};

