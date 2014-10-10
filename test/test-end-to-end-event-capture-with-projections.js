var uuid = require('node-uuid');
var client = require('../lib/index');
var expect = require('chai').expect;
var quest = require('./quest-events');
var harness = require('./harness');

var e1_1 = quest.QuestStarted("Emond's Field", ['Rand', 'Perrin', 'Mat', 'Thom', 'Egwene', 'Moiraine']);
var e1_2 = quest.EndOfDay(5);
var e1_3 = quest.TownReached('Baerlon', 11);
var e1_4 = quest.MembersDeparted('Shadar Logoth', ['Thom']);
var e1_5 = quest.EndOfDay(15);
var e1_6 = quest.QuestEnded('Eye of the World', 117);

var e2_1 = quest.QuestStarted("Faldor's Farm", ['Garion', 'Pol', 'Belgarath', 'Durnik']);
var e2_2 = quest.EndOfDay(10);
var e2_3 = quest.TownReached('Camaar', 23);
var e2_4 = quest.MembersJoined('Sendaria', ['Barak', 'Silk']);
var e2_5 = quest.TownReached('Cherek', 34);
var e2_6 = quest.MembersJoined('Vo Wacune', ['Lelldorin']);
var e2_7 = quest.MembersJoined('Mimbre', ['Mandorallen']);
var e2_8 = quest.MembersDeparted('Mimbre', ['Lelldorin']);

var e3_1 = quest.QuestStarted('Rivendell', ['Gandolf', 'Gimli', 'Aragorn', 'Legolas', 'Merry', 'Pippin', 'Sam', 'Frodo', 'Boromir']);
var e3_2 = quest.EndOfDay(7);
var e3_3 = quest.TownReached('Moria', 111);
var e3_4 = quest.MembersDeparted('Moria', ['Gandolf']);


function scenario(text, func){
	it(text, function(){
		return harness.scenario(func);
	});
}

function scenario_only(text, func){
	it.only(text, function(){
		return harness.scenario(func);
	});
}

describe('End to End Event Capture and Projections', function(){
	before(function(){
		return harness.seed();
	});

	beforeEach(function(){
		return harness.cleanAll();
	});

	scenario('can capture events for a new stream', function(x){
		var id = uuid.v4();

		x.append(id, 'Quest', e1_1, e1_2, e1_3);
		x.stream(id, function(x){
			expect(x.events[0]).to.deep.equal(e1_1);
			expect(x.events[1]).to.deep.equal(e1_2);
			expect(x.events[2]).to.deep.equal(e1_3);

			expect(x.version).to.equal(3);
			expect(x.type).to.equal('Quest');
		});
	});


	scenario('can capture events for a new stream and auto assign the id', function(x){
		x.append('Quest', e1_1, e1_2, e1_3);
		x.stream(function(s){
			expect(s.events[0]).to.deep.equal(e1_1);
			expect(s.events[1]).to.deep.equal(e1_2);
			expect(s.events[2]).to.deep.equal(e1_3);

			expect(s.version).to.equal(3);
			expect(s.type).to.equal('Quest');
		});
	});

	scenario('can append events to an existing stream', function(x){
		var id = uuid.v4();

		x.append(id, 'Quest', e1_1);
		x.append(id, e1_2, e1_3);

		x.stream(function(s){
			expect(s.events[0]).to.deep.equal(e1_1);
			expect(s.events[1]).to.deep.equal(e1_2);
			expect(s.events[2]).to.deep.equal(e1_3);

			expect(s.version).to.equal(3);
			expect(s.type).to.equal('Quest');
		});
	});

	scenario('can update a view across a stream to reflect latest', function(x){
		var id = uuid.v4();

		x.append(id, 'Quest', e1_1, e1_2, e1_3);
		x.viewShouldBe(id, 'Party', {
			active: true,
			location: 'Baerlon',
			traveled: 16,
			members: ['Egwene', 'Mat', 'Moiraine', 'Perrin', 'Rand', 'Thom']
		});


		x.append(id, e1_4, e1_5);
		x.viewShouldBe(id, 'Party', {
			active: true,
			location: 'Shadar Logoth',
			traveled: 31,
			members: ['Egwene', 'Mat', 'Moiraine', 'Perrin', 'Rand']
		});

	});

	scenario('can queue events that have async projections', function(x){
		var id = uuid.v4();

		x.queueDepthShouldBe(0);
		x.append(id, 'Quest', e1_1, e1_2, e1_3);
		x.queueDepthShouldBe(3);

		x.queueContentsShouldBe([{event: e1_1.$id, stream: id}, {event: e1_2.$id, stream: id}, {event: e1_3.$id, stream: id} ])

	});

});