DROP TABLE IF EXISTS pge_streams CASCADE;
CREATE TABLE pge_streams (
	id					uuid CONSTRAINT pk_pge_streams PRIMARY KEY,
	type				varchar(100) NOT NULL,
	version				integer NOT NULL,
	snapshot			json,
	snapshot_version	integer	
);


DROP TABLE IF EXISTS pge_events;
CREATE TABLE pge_events (
	id 			uuid CONSTRAINT pk_pge_events PRIMARY KEY,
	stream_id	uuid REFERENCES pge_streams ON DELETE CASCADE,
	version		integer NOT NULL,
	data		json NOT NULL,
	type 		varchar(100) NOT NULL,
	timestamp	timestamp without time zone default (now() at time zone 'utc') NOT NULL,
	CONSTRAINT pk_pge_events_stream_and_version UNIQUE(stream_id, version)
);

DROP TABLE IF EXISTS pge_projection_errors;
CREATE TABLE pge_projection_errors (
	id 			uuid CONSTRAINT pk_pge_projection_errors PRIMARY KEY,
	event_id	uuid NOT NULL,
	projection 	varchar(100) NOT NULL,
	error 		varchar(1000) NOT NULL
);


-- TODO: add an index on id and type. 
DROP TABLE IF EXISTS pge_projections CASCADE;
CREATE TABLE pge_projections (
	id			uuid,
	type 		varchar(100) NOT NULL,
	data		json NOT NULL,
	CONSTRAINT pk_pge_projections PRIMARY KEY(id, type)
);

DROP TABLE IF EXISTS pge_projection_definitions CASCADE;
CREATE TABLE pge_projection_definitions (
	name			varchar(100) CONSTRAINT pk_pge_projection_definitions PRIMARY KEY,
	definition		varchar(3000) NOT NULL
);

DROP TABLE IF EXISTS pge_modules CASCADE;
CREATE TABLE pge_modules (
	name			varchar(100) CONSTRAINT pk_pge_modules PRIMARY KEY,
	definition		varchar(30000) NOT NULL
);

DROP TABLE IF EXISTS pge_aggregates CASCADE;
CREATE TABLE pge_aggregates (
	name		varchar(100) CONSTRAINT pk_pge_aggregates PRIMARY KEY,
	data		json NOT NULL
);

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";




