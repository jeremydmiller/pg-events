var FunctionTemplate = require('./function-template');
var _ = require('lodash');

var funcWithResult = new FunctionTemplate('function-with-result');
var noargFuncWithResult = new FunctionTemplate('noarg-function-with-result');

function PostgresService(base, db){
	_.assign(this, base);

	this.db = db;

	return this;
}

PostgresService.prototype.findFunctionResult = function(member, cmd, args){
	if (args ==null || args.length == 0){
		eval(noargFuncWithResult.create({member: member, cmd: cmd}));
	}
	else {
		eval(funcWithResult.create({member: member, cmd: cmd, args: args}));
	}
}

PostgresService.prototype.query = function(sql, args){
	if (args.length == 0){
		return this.db.query(sql);
	}

	return this.db.query(sql, args);
}

module.exports = PostgresService;