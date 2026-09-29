-- When the stream processor stored each report, by the API's clock: the clock
-- that also set received_at. The gap between the two is how long a report
-- spent between ingestion and storage, waiting in Kafka and being written
-- (docs/adr/0014-kafka-between-ingestion-and-storage.md).
--
-- Null for reports stored before the stream existed, which were written in the
-- request that received them, and for rows written other than by the stream,
-- such as test fixtures. The stream processor sets it on every report it stores.

alter table reports add column stored_at timestamptz;
