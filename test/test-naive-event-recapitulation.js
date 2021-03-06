var uuid = require('node-uuid');
var client = require('../lib/index');
var expect = require('chai').expect;
var quest = require('./quest-events');
var harness = require('./harness');
var _ = require('lodash');
var Promise = require("bluebird");

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

describe('Replaying projections and events', function(){

	before(function(){
		return harness.seed();
	});

	beforeEach(function(){
		return harness.cleanAll();
	});

	scenario('can replay the projections from the stored events', function(x){
		var id = uuid.v4();

		x.append(id, 'Quest', e1_1, e1_2, e1_3);
		x.append(id, e1_4, e1_5);

		// Messing up the Party and Party2 projection data
		x.withClient(function(c){
			return c.db.query('update pge_projections_party set data = ?', ['{}']);
		});

		x.withClient(function(c){
			return c.db.query('update pge_projections_party2 set data = ?', ['{}']);
		});

		x.withClient(function(c){
			return c.config.rebuildAll();
		});

		// The synchronous Party view is rebuilt
		x.viewShouldBe(id, 'Party', {
			active: true,
			location: 'Shadar Logoth',
			traveled: 31,
			members: ['Egwene', 'Mat', 'Moiraine', 'Perrin', 'Rand']
		});

		// The asynchronous Party2 view is also rebuilt
		x.viewShouldBe(id, 'Party2', {
			active: true,
			location: 'Shadar Logoth',
			traveled: 31,
			members: ['Egwene', 'Mat', 'Moiraine', 'Perrin', 'Rand']
		});
	});




});