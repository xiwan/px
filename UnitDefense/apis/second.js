var apis = exports.apis = {};

apis.testABC = function(protocol, cb) {
	var self = this;
	self.gameSystem.testABC(function(err, results){
		cb(err, {msg: results})		
	});

};

apis.test1 = function(protocol, cb) {
	var self = this;
	self.gameSystem.test1(function(err, results){
		cb(err, {msg: results})		
	});	
};