-- Tells the API the moment an alert is raised or changes, so it can push the
-- alert to inspectors' dashboards over WebSocket
-- (docs/adr/0016-alerts-pushed-over-websocket.md).
--
-- PostgreSQL delivers a notification only when the writing transaction
-- commits, and drops it if the transaction rolls back, so an inspector is never
-- told of an alert that was not written. Every writer is covered without
-- knowing it: the detector raising and extending alerts, and inspectors moving
-- them on through the API. The payload is the kind of change and the alert's
-- code, nothing more; the API reads the alert itself.

create function notify_alert_change() returns trigger
language plpgsql as $$
begin
    perform pg_notify(
        'sentinel_alert_changes',
        case tg_op when 'INSERT' then 'RAISED ' else 'UPDATED ' end || new.code
    );
    return null;
end;
$$;

create trigger alerts_notify_raised
    after insert on alerts
    for each row execute function notify_alert_change();

-- An update that changes nothing is not news.
create trigger alerts_notify_updated
    after update on alerts
    for each row
    when (old is distinct from new)
    execute function notify_alert_change();
