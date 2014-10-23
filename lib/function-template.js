var fs = require("fs");
var _ = require('lodash');

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(string, find, replace) {
  return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function toArgList(args){
	return _(args).join(', ');
}

function toPlaceholders(args){
	return _(args).map(function(x){return '?';}).join(', ');
}

var substitutions = {
	member: '$METHOD$',
	cmd: '$COMMAND$'
}

function FunctionTemplate(filename){
	var path = __dirname + '/templates/' + filename + '.txt';
	this.template = fs.readFileSync(path, "utf8");
}

FunctionTemplate.prototype.create = function(params){
	var text = this.template;

	for (var key in params){
		if (key == 'args'){
			var args = params.args;
			text = replaceAll(text, '$ARGS$', toArgList(args));
			text = replaceAll(text, '$QUERYARGS$', toPlaceholders(args));
		}
		else{
			var substitute = substitutions[key];
			text = replaceAll(text, substitute, params[key]);
		}
	}

	return text;
}

module.exports = FunctionTemplate;