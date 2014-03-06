module.exports = function AccessControl(payload) {

	var redisClient = require("redis").createClient();
	var crypto = require('crypto');
	
	this.initVars = function(){
		this.username = '';
		this.loggedIn = false;
		this.bootstrap_debug();
	};
	
	this.bootstrap_debug = function(){
		redisClient.hmset("userinfo.menno", {"password": this.encryptPassword("blaat")});
	};
	
	if (typeof payload != 'undefined' ){
		this.loggedIn = payload.loggedIn;
		this.username = payload.username;
	}
	
	this.login = function(username, password, callback){
		var self = this;
		redisClient.hgetall("userinfo." + username, function(error, reply){
			var success = false;
			if(self.checkPassword(password, reply.password)){
				self.username = username;
				self.loggedIn = true;
				success = true;
			}
			callback(success);
		});
	};
	
	this.isLoggedIn = function(){
		return this.loggedIn;
	};
	
	this.logout = function(){
		this.username = '';
		this.loggedIn = false;
	};
	
	this.checkPassword = function(password, encrypedPassword){
		if(this.encryptPassword(password) == encrypedPassword){
			return true;
		}else{
			return false;
		}
	};
	
	this.encryptPassword = function(password){
		return crypto.createHash('sha256').update(password).digest('base64');
	};
	
	this.initVars();
};
