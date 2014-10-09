require("../../lib/projections")
	.projectEvent({
		event: 'TownReached',
		name: 'Arrival',
		mode: 'sync',
		transform: function(evt){
			return {
				town: evt.location,
				$id: evt.$id
			};
		}
	});




