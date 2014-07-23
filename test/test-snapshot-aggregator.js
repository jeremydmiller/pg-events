var expect = require('chai').expect;
var SnapshotAggregator = require("../lib/snapshot-aggregator");
var quest = require('./quest-events');
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

function FakeStore(){

	this.aggregates = {};
	this.events = {};


	this.findLatest = function(id){
		return this.aggregates[id];
	}

	this.persist = function(id, data, version){
		this.aggregates[id] = {data: data, version: version};
	}

	this.findEventsAfter = function(id, version){
		return _.filter(this.events[id], function(x){
			return x.version > version;
		});
	}

	this.saveEvents = function(id, events){
		var storage = this.events[id];
		if (storage == null){
			storage = [];
		}

		for (var i = 0; i < events.length; i++){
			storage.push({version: storage.length + 1, data: events[i]});
		}

		this.events[id] = storage;
	}


	this.clearAll = function(){
		this.aggregates = {};
		this.events = {};

	}

	this.findEventsUpTo = function(id, version){
		return _.filter(this.events[id], function(x){
			return x.version <= version;
		})
		.map(function(e){
			return e.data;
		});
	}

	return this;
}

describe('The SnapshotAggregator', function(){
	var store = new FakeStore();

	beforeEach(function(){
		store.clearAll();
	});

	var aggregator = new SnapshotAggregator('Party', {
		$init: function(){
			return {
				active: true,
				traveled: 0,
				location: null,
				members: []
			}
		},

		QuestStarted: function(state, evt){
			state.active = true;
			state.location = evt.location;
			state.members = evt.members.slice(0);

			state.members.sort();
		},

		TownReached: function(state, evt){
			state.location = evt.location;
			state.traveled += evt.traveled;
		},

		EndOfDay: function(state, evt){
			state.traveled += evt.traveled;
		},

		QuestEnded: function(state, evt){
			state.active = false;
			state.location = evt.location;
		},

		MembersJoined: function(state, evt){
			state.members = state.members.concat(evt.members);
			state.members.sort();
		},

		MembersDeparted: function(state, evt){
			state.location = evt.location;

			for (var i = 0; i < evt.members.length; i++){
				var index = state.members.indexOf(evt.members[i]);
				state.members.splice(index, 1);
			}

			state.members.sort();
		}

	});

	it('builds the latest snapshot', function(){
		store.saveEvents(1, [e1_1, e1_2, e1_3]);
		store.saveEvents(2, [e2_1, e2_2, e2_3, e2_4]);


		expect(aggregator.latest(store, 1)).to.deep.equal({
			$version: 3, 
			active: true, 
			location: 'Baerlon', 
			members: ['Egwene', 'Mat', 'Moiraine', 'Perrin', 'Rand', 'Thom'],
			traveled: 16
		});

		expect(aggregator.latest(store, 2)).to.deep.equal({
			$version: 4,
			active: true,
			location: 'Camaar',
			members: ['Barak', 'Belgarath', 'Durnik', 'Garion', 'Pol', 'Silk'],
			traveled: 33

		});
	});

	it('build a snapshot for the first time', function(){
		store.saveEvents(1, [e1_1, e1_2, e1_3]);
		store.saveEvents(2, [e2_1, e2_2, e2_3, e2_4]);

		aggregator.rebuild(store, 1);
		aggregator.rebuild(store, 2);

		expect(store.aggregates[1].data).to.deep.equal({
			$version: 3, 
			active: true, 
			location: 'Baerlon', 
			members: ['Egwene', 'Mat', 'Moiraine', 'Perrin', 'Rand', 'Thom'],
			traveled: 16
		});

		expect(store.aggregates[2].data).to.deep.equal({
			$version: 4,
			active: true,
			location: 'Camaar',
			members: ['Barak', 'Belgarath', 'Durnik', 'Garion', 'Pol', 'Silk'],
			traveled: 33

		});
	});

	it('can rebuild a snapshot based on an existing snapshot', function(){
		store.saveEvents(1, [e1_1, e1_2, e1_3]);
		aggregator.rebuild(store, 1);

		store.saveEvents(1, [e1_4, e1_5]);
		aggregator.rebuild(store, 1);

		expect(store.aggregates[1].data).to.deep.equal({
			$version: 5, 
			active: true, 
			location: 'Shadar Logoth', 
			members: ['Egwene', 'Mat', 'Moiraine', 'Perrin', 'Rand'],
			traveled: 31
		});

	});

	it('can build a snapshot up to a certain version', function(){
		store.saveEvents(1, [e1_1, e1_2, e1_3, e1_4, e1_5]);
		store.saveEvents(2, [e2_1, e2_2, e2_3, e2_4, e2_5]);

		expect(aggregator.atVersion(store, 1, 3)).to.deep.equal({
			$version: 3, 
			active: true, 
			location: 'Baerlon', 
			members: ['Egwene', 'Mat', 'Moiraine', 'Perrin', 'Rand', 'Thom'],
			traveled: 16
		});


		expect(aggregator.atVersion(store, 1, 5)).to.deep.equal({
			$version: 5, 
			active: true, 
			location: 'Shadar Logoth', 
			members: ['Egwene', 'Mat', 'Moiraine', 'Perrin', 'Rand'],
			traveled: 31
		});

		expect(aggregator.atVersion(store, 2, 4)).to.deep.equal({
			$version: 4,
			active: true,
			location: 'Camaar',
			members: ['Barak', 'Belgarath', 'Durnik', 'Garion', 'Pol', 'Silk'],
			traveled: 33

		});

	});
});

