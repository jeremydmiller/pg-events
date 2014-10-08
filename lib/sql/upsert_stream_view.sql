CREATE OR REPLACE FUNCTION pge_upsert_$DBNAME$_view(streamId UUID, evt JSON) RETURNS VOID AS
$$
BEGIN
	UPDATE pge_projections_$DBNAME$ set data = pge_apply_projection('$NAME$', data, evt) where id = streamId;

	-- TODO -- have it check for unique violation maybe?
	IF NOT FOUND THEN
		insert into pge_projections_$DBNAME$ (id, data) values (streamId, pge_apply_projection('$NAME$', null, evt));
	END IF; 
END;
$$ LANGUAGE plpgsql;