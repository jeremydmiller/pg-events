require("../../lib/projections")
	.projectAcrossStreams({
		name: 'Traveled',
		$init: function(){
			return {
				traveled: 0
			};
		},

		TownReached: function(state, evt){
			state.traveled += evt.traveled;
		},

		EndOfDay: function(state, evt){
			if (evt.traveled < 0){
				throw new Error('you cannot go backwards!');
			}

			state.traveled += evt.traveled;
		}
	});

