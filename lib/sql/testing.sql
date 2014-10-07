
truncate table pge_streams CASCADE ;

--select pge_initialize();

--select pge_append_event('{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"type": "QuestStarted", "streamType": "Quest", "data": {"location": "Rivendell"}}');
--select pge_append_event('{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"type": "TownReached", "data": {"location": "Moria", "traveled":"5"}}');


--select pge_append_event('{"data":[{"$type":"TownReached","location":"Baerlon","traveled":5}],"id":"b5b1e5a7-44b9-4c0b-b5ad-3095c732874e"}');
--select pge_append_event('{"data":[{"$type":"TownReached","location":"Caemlyn","traveled":5}],"id":"b5b1e5a7-44b9-4c0b-b5ad-3095c732874e"}');


--select pge_fetch_latest_aggregate('b5b1e5a7-44b9-4c0b-b5ad-3095c732874e');


CREATE OR REPLACE FUNCTION pge_append_event(message json) RETURNS JSON AS $$
DECLARE
	--streamId UUID;
	events JSON[];
	msg VARCHAR[100];
BEGIN
	--streamId := message::json->'id';
	
msg := message::json->'id';
	raise notice 'hello %', msg;
	

/*
	if (plv8.events == null){
		plv8.execute('select pge_initialize()');
	}

	return plv8.events.store(message);
*/

	return '{"id": "1", "stream": "2"}';

END
$$ LANGUAGE plpgsql;



select pge_append_event('{"data":[{"$type":"TownReached","location":"Baerlon","traveled":5}],"id":"b5b1e5a7-44b9-4c0b-b5ad-3095c732874e"}');
--select pge_append_event('{"data":[{"$type":"TownReached","location":"Caemlyn","traveled":5}],"id":"b5b1e5a7-44b9-4c0b-b5ad-3095c732874e"}');


select * from pge_streams;