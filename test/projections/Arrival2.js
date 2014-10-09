require("../../lib/projections")
	.projectEvent({
		event: 'TownReached',
		name: 'Arrival2',
		mode: 'async',
		transform: function(evt){
			return {
				town: evt.location,
				$id: evt.$id
			};
		}
	});