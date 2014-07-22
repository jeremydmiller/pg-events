\i initializer.sql;
\i append_events.sql;

truncate table pge_streams CASCADE ;

select pge_initialize();

--select pge_append_event('{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"type": "QuestStarted", "streamType": "Quest", "data": {"location": "Rivendell"}}');
--select pge_append_event('{"id":"21bdc410-f15c-11e3-a583-7325f030e4a2" ,"type": "TownReached", "data": {"location": "Moria", "traveled":"5"}}');


select pge_append_event('{"data":[{"$type":"TownReached","location":"Baerlon","traveled":5}],"id":"b5b1e5a7-44b9-4c0b-b5ad-3095c732874e"}');


select * from pge_projections_party;
select * from pge_projections_arrival;