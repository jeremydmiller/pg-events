var uuid = require('node-uuid');
var client = require('../lib/index');
var expect = require('chai').expect;
var harness = require('./harness');

var Promise = require("bluebird");

function scenario(text, func){
	it(text, function(){
		return harness.scenario(func);
	});
}

describe('Seeding Rolling Buffer Tables', function(){

	before(function(){
		return harness.seed();
	});

	beforeEach(function(){
		return harness.cleanAll();
	});


	scenario('can capture events for a new stream', function(x){
		x.dbSingleRowShouldBe('select count(*) as count from pge_rolling_buffer', [], {count: "200"});
	});



});