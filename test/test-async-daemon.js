var uuid = require('node-uuid');
var client = require('../lib/index');
var expect = require('chai').expect;
var quest = require('./quest-events');
var harness = require('./harness');
var _ = require('lodash');

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

var badEvent = quest.EndOfDay(-10);

function scenario(text, func){
	it(text, function(){
		this.timeout(10000);

		return harness.scenario(func);
	});
}

function scenario_only(text, func){
	it.only(text, function(){
		this.timeout(10000);

		return harness.scenario(func);
	});
}

describe('End to End Event Capture with Asynchronous Projections', function(){
	before(function(){
		this.timeout(10000);
		return harness.seed();
	});

	beforeEach(function(){
		this.timeout(10000);
		return harness.cleanAll();
	});

/* leaves too many database locks laying around. Not sure it requires any work now,
but certainly later
	scenario('can process an aggregate projection across streams', function(x){
		x.startAsyncDaemon();

		x.append(uuid.v4(), 'Quest', e1_1, e1_2, e1_3, e1_4, e1_5);
		x.append(uuid.v4(), 'Quest', e2_1, e2_2, e2_3, e2_4, e2_5);
		x.append(uuid.v4(), 'Quest', e3_1, e3_2, e3_3, e3_4);

		x.waitForNonStaleResults();

		// the following are the events that apply to the aggregation
		// for 'Traveled'
		var events = [e1_2, e1_3, e1_5, e2_2, e2_3, e2_5, e3_2, e3_3];
		// the sum is 216

		x.aggregateShouldBe('Traveled', {traveled: 216});

	});
*/
	scenario('can update a stream projection from queued events', function(x){
		var id = uuid.v4();

		x.queueDepthShouldBe(0);
		x.append(id, 'Quest', e1_1, e1_2, e1_3);
		x.queueDepthShouldBe(3);
		x.executeAllQueuedProjectionEvents();
		x.queueDepthShouldBe(0);

		x.viewShouldBe(id, 'Party2', {
			active: true,
			location: 'Baerlon',
			traveled: 16,
			members: ['Egwene', 'Mat', 'Moiraine', 'Perrin', 'Rand', 'Thom']
		});


		x.append(id, e1_4, e1_5);
		x.executeAllQueuedProjectionEvents();

		x.shouldBeNoRecordedErrorsFromAsyncProjectionProcessing();

		x.viewShouldBe(id, 'Party2', {
			active: true,
			location: 'Shadar Logoth',
			traveled: 31,
			members: ['Egwene', 'Mat', 'Moiraine', 'Perrin', 'Rand']
		});

		x.aggregateShouldBe('Traveled', {traveled: 31});
	});

	scenario('can trap projection errors as async projections are processed', function(x){
		var id = uuid.v4();

		x.append(id, 'Quest', e1_1, e1_2, e1_3);

		// these events will fail in the 'Traveled' projection
		x.append(id, quest.EndOfDay(-10), quest.EndOfDay(-5));

		x.executeAllQueuedProjectionEvents(function(errors){
			expect(errors.length).to.equal(2);

			var firstError = errors[0];
			expect(firstError.projection).to.equal('Traveled');
			expect(firstError.error).to.equal('Error: you cannot go backwards!');


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