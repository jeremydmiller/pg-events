function PostgresService(db){
	this.db = db;
}

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(string, find, replace) {
  return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

var fs = require("fs");
var path = __dirname + '/postgres-function-query.txt';
var template = fs.readFileSync(path, "utf8");

var _ = require('lodash');

function PostgresService(base, db){
	_.assign(this, base);

	this.db = db;

	return this;
}

PostgresService.prototype.findFunctionResult = function(member, cmd, args){
	var argList = _(args).join(', ');
	var queryList = _(args).map(function(x){return '?';}).join(', ');

	var func = replaceAll(template, '$ARGS$', argList);
	func = replaceAll(func, '$QUERYARGS$', queryList);
	func = replaceAll(func, '$COMMAND$', cmd);
	func = replaceAll(func, '$METHOD$', member);

	eval(func);
}

PostgresService.prototype.query = function(sql, args){
	if (args.length == 0){
		return this.db.query(sql);
	}

	return this.db.query(sql, args);
}

module.exports = PostgresService;