var client = require('../lib/pg-eventstore');

module.exports = {
	QuestStarted: function(location, members){
		var evt = client.newEvent('QuestStarted');

		evt.location = location;
		evt.members = members;
		evt.members.sort();

		return evt;
	},

	TownReached: function(location, traveled){
		var evt = client.newEvent('TownReached');

		evt.location = location;
		evt.traveled = traveled;

		return evt;
	},

	EndOfDay: function(traveled){
		var evt = client.newEvent('EndOfDay');

		evt.traveled = traveled;

		return evt;
	},

	QuestEnded: function(location, traveled){
		var evt = client.newEvent('QuestEnded');

		evt.location = location;
		evt.traveled = traveled;

		return evt;
	},

	MembersJoined: function(location, members){
		var evt = client.newEvent('MembersJoined');

		evt.location = location;
		evt.members = members;
		evt.members.sort();

		return evt;
	},

	MembersDeparted: function(location, members){
		var evt = client.newEvent('MembersDeparted');

		evt.location = location;
		evt.members = members;
		evt.members.sort();

		return evt;
	}	
};