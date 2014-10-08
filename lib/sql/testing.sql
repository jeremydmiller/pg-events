
truncate table pge_streams CASCADE ;

--select pge_initialize();

--select pge_append_event('{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"type": "QuestStarted", "streamType": "Quest", "data": {"location": "Rivendell"}}');
--select pge_append_event('{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"type": "TownReached", "data": {"location": "Moria", "traveled":"5"}}');


--select pge_append_event('{"data":[{"$type":"TownReached","location":"Baerlon","traveled":5}],"id":"b5b1e5a7-44b9-4c0b-b5ad-3095c732874e"}');
--select pge_append_event('{"data":[{"$type":"TownReached","location":"Caemlyn","traveled":5}],"id":"b5b1e5a7-44b9-4c0b-b5ad-3095c732874e"}');


--select pge_fetch_latest_aggregate('b5b1e5a7-44b9-4c0b-b5ad-3095c732874e');

CREATE OR REPLACE FUNCTION pge_upsert_party_view(streamId UUID, evt JSON) RETURNS VOID AS
$$
BEGIN
	UPDATE pge_projections_party set data = pge_apply_projection('Party', data, evt) where id = streamId;

	-- TODO -- have it check for unique violation maybe?
	IF NOT FOUND THEN
		insert into pge_projections_party (id, data) values (streamId, pge_apply_projection('Party', null, evt));
	END IF; 
END;
$$ LANGUAGE plpgsql;


select pge_upsert_party_view('21bdc410-f15c-11e3-a583-7325f030e4a2', '{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"$type": "QuestStarted", "streamType": "Quest", "data": {"location": "Rivendell", "members": []}}');
select pge_upsert_party_view('21bdc410-f15c-11e3-a583-7325f030e4a2', '{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"$type": "TownReached", "data": {"location": "Moria", "traveled":"5"}}');


select * from pge_projections_party;