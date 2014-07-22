require("../../lib/projections")
	.projectEvent('TownReached')
	.named('Arrival')
	.by(function(evt){
		return {
			town: evt.location,
			$id: evt.$id
		};
	});
