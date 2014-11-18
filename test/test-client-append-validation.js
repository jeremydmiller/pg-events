var uuid = require('node-uuid');
var client = require('../lib/index');
var expect = require('chai').expect;

describe('Validating the data passed into client.append()', function(){
	it('will throw if no event data is passed in', function(){
		expect(function(){
			client.append({data: [{}]});
		}).to.throw(Error);
	});

	it('will throw if the event type is missing from any', function(){
		expect(function(){
			client.append({});
		}).to.throw(Error, /No event data/);
	});
});