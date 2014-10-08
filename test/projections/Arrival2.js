require("../../lib/projections")
	.projectEvent({
		event: 'TownReached',
		name: 'Arrival2',
		async: true,
		transform: function(evt){
			return {
				town: evt.location,
				$id: evt.$id
			};
		}
	});