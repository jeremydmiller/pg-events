require("../../lib/projections")
	.aggregate('Traveled')
	.by({
		$init: function(){
			return {
				traveled: 0
			};
		},

		TownReached: function(state, evt){
			state.traveled += evt.traveled;
		},

		EndOfDay: function(state, evt){
			state.traveled += evt.traveled;
		}
	});

