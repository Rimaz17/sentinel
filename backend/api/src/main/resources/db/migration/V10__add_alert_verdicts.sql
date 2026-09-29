-- An inspector's verdict on an alert: confirmed as real, or a false alarm.
--
-- The verdict is what gates publication. An alert reaches the public dashboard
-- once an inspector confirms it, or, without any verdict, once it has run far
-- enough above its baseline that it is published on that evidence alone (see
-- docs/adr/0013-public-alerts.md). A false alarm is never published, and marking
-- one closes the alert.
--
-- A verdict is final and records who gave it and when. The detector never
-- writes these columns; it may still extend a judged alert while its series
-- stays high, which is the same episode the inspector already judged.

alter table alerts
    add column verdict    text,
    add column verdict_at timestamptz,
    add column verdict_by bigint references accounts (id),
    add constraint alerts_verdict check (verdict in ('CONFIRMED', 'FALSE_ALARM')),
    add constraint alerts_verdict_recorded check (
        (verdict is null) = (verdict_at is null) and (verdict is null) = (verdict_by is null)
    ),
    add constraint alerts_false_alarm_closed check (verdict <> 'FALSE_ALARM' or status = 'CLOSED');
