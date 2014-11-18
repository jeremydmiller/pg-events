
CREATE OR REPLACE FUNCTION pge_rolling_buffer_status() RETURNS JSON AS $$
  if (plv8.projector == null){
    plv8.execute('select pge_initialize()');
  }

  try {
    return plv8.store.queueStatus();
  }
  catch (e){
    throw new Error('Failed in postgres-store.queueStatus() --> ' + e);
  }
  
$$ LANGUAGE plv8;


CREATE OR REPLACE FUNCTION pge_process_async_projections() RETURNS JSON AS $$
  if (plv8.projector == null){
    plv8.execute('select pge_initialize()');
  }

  var queued = plv8.store.queuedEvents();
  var errors = [];

  for (var i = 0; i < queued.length; i++){
    var queuedEvent = queued[i];
    
    var event = queued[i].data;

    if (event == null){
      throw new Error('No event data --> ' + JSON.stringify(queuedEvent));
    }

    if (event.$type == null){
      throw new Error('No event type supplied --> ' + JSON.stringify(queuedEvent));
    }

    var id = queued[i].stream_id;
    var slot = queued[i].slot;



    // The EventStore is trapping and logging errors itself.
    plv8.subtransaction(function(){
      plv8.events.processAsyncProjection(event, id, slot, errors);
    });
  }

  var result = plv8.store.queueStatus();
  result.count = queued.length;
  result.errors = errors;

  return result;
$$ LANGUAGE plv8;

