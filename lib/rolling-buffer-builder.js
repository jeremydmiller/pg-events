var StringBuilder = require('./string-builder');
var Promise = require("bluebird");

var fs = require("fs");
Promise.promisifyAll(fs);

var path = __dirname + '/sql/rolling-buffer-template.sql';
var template = fs.readFileAsync(path, "utf8");

function RollingBufferBuilder(name, size){
	this.ddl = null;

	var self = this;

	template.then(function(text){
		self.ddl = text.replace('$NAME$', name).replace('$SIZE$', size);

		return text;
	});

	this.writeInitialization = function(sb){
		sb.appendLine("select pge_$NAME$_seed_rolling_buffer();".replace('$NAME$', name));
		sb.appendLine("CLUSTER pge_$NAME$_rolling_buffer USING pk_pge_$NAME$_rolling_buffer;".replace('$NAME$', name));
	}




}