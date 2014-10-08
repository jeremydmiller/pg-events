var uuid = require('node-uuid');
var client = require('../lib/index');
var expect = require('chai').expect;
var quest = require('./quest-events');
var harness = require('./harness');

var e0 = quest.QuestStarted("Austin", []);
var e1 = quest.MembersJoined('A', ['a']);
var e2 = quest.MembersJoined('B', ['b']);
var e3 = quest.MembersJoined('C', ['c']);
var e4 = quest.MembersJoined('D', ['d']);
var e5 = quest.MembersJoined('E', ['e']);
var e6 = quest.MembersJoined('F', ['f']);
var e7 = quest.MembersJoined('G', ['g']);
var e8 = quest.MembersJoined('H', ['h']);
var e9 = quest.MembersJoined('I', ['i']);
var e10 = quest.MembersJoined('J', ['j']);
var e11 = quest.MembersJoined('K', ['k']);

function scenario(text, func){
	it(text, function(){
		return harness.scenario(func);
	});
}


describe('End to End Snapshot Aggregation', function(){
	before(function(){
		return harness.seed();
	});

	beforeEach(function(){
		return harness.cleanAll();
	});

	scenario('will not create any snapshot before the threshold of events', function(x){
		var id = uuid.v4();
		x.append(id, e0, e1);
		x.snapshotShouldBeNull();

		x.append(id, e2, e3);
		x.snapshotShouldBeNull();

	});

	scenario('will create the first snapshot when the number of events crosses the max age', function(x){
		var id = uuid.v4();

		x.append(id, e0, e1, e2, e3, e4);
		x.snapshotShouldBe(id, {$version: 5, active: true, location: 'Austin', traveled: 0, members: ['a', 'b', 'c', 'd']});
	});

	scenario('will not recreate a new snapshot before the age threshold', function(x){
		var id = uuid.v4();

		x.append(id, e0, e1, e2, e3, e4);
		x.snapshotShouldBe(id, {$version: 5, active: true, location: 'Austin', traveled: 0, members: ['a', 'b', 'c', 'd']});


		x.append(id, e5, e6, e7);
		// did not change
		x.snapshotShouldBe(id, {$version: 5, active: true, location: 'Austin', traveled: 0, members: ['a', 'b', 'c', 'd']});
	});

	scenario('will build subsequent snapshots', function(x){
		var id = uuid.v4();

		x.append(id, e0, e1, e2, e3, e4);
		x.snapshotShouldBe(id, {$version: 5, active: true, location: 'Austin', traveled: 0, members: ['a', 'b', 'c', 'd']});


		x.append(id, e5, e6, e7);
		x.append(id, e8, e9, e10, e11);
		// did not change
		x.snapshotShouldBe(id, {$version: 12, active: true, location: 'Austin', traveled: 0, members: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']});
	});

	scenario('can build and fetch the latest with no snapshot', function(x){
		var id = uuid.v4();
		x.append(id, e0, e1, e2);
		x.snapshotShouldBeNull();

		x.latestAggregateShouldBe(id, {$version: 3, active: true, location: 'Austin', traveled: 0, members: ['a', 'b']});
	
		x.append(id, e3);
		x.snapshotShouldBeNull();

		x.latestAggregateShouldBe(id, {$version: 4, active: true, location: 'Austin', traveled: 0, members: ['a', 'b', 'c']});
		
	});

	scenario('can build and fetch the latest on top of a snapshot', function(x){
		var id = uuid.v4();

		x.append(id, e0, e1, e2, e3, e4);
		x.append(id, e5, e6);

		x.latestAggregateShouldBe(id, {$version: 7, active: true, location: 'Austin', traveled: 0, members: ['a', 'b', 'c', 'd', 'e', 'f']})
	});

});