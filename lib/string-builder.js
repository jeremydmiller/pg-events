function StringBuilder(text){
	this.text = text || '';

	return this;
}

StringBuilder.prototype.appendLine = function(text){
	if (arguments.length == 0){
		this.text = this.text + '\n';
		return;
	}

	this.text = this.text + text + '\n';
}

module.exports = StringBuilder;
