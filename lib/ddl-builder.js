var fs = require("fs");
var StringBuilder = require('./string-builder');

function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

function replaceAll(string, find, replace) {
  return string.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

var cache = {
	templates: {},

	find: function(name){
		if (!this.templates[name]){
			var path = __dirname + '/sql/' + name + '.sql';
			var template = fs.readFileSync(path, "utf8");

			this.templates[name] = template;
		}

		return this.templates[name];
	}
}

function DdlBuilder(){
	this.builder = new StringBuilder();
}

DdlBuilder.prototype.add = function(template, options){
	var text = cache.find(template);


	for (key in options){
		var sub = '$' + key.toUpperCase() + '$';
		text = replaceAll(text, sub, options[key]);
	}



	this.builder.appendLine(text);
	this.builder.appendLine();
	this.builder.appendLine();
}

DdlBuilder.prototype.text = function(){
	return this.builder.text;
}





module.exports = DdlBuilder;