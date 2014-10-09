require("../../lib/projections")
	.projectStream({
		name: 'Party2',
		stream: 'Quest', 
		mode: 'async',

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
