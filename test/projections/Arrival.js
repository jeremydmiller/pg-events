require("../../lib/projections")
	.projectEvent({
		event: 'TownReached',
		name: 'Arrival',
		async: false,
		transform: function(evt){
			return {
				town: evt.location,
				$id: evt.$id
			};
		}
	});
