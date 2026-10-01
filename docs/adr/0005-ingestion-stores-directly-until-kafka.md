# 0005, Ingestion stores reports directly until Kafka arrives

Status: superseded by [0014](0014-kafka-between-ingestion-and-storage.md) · 2026-09-30

## Context

The architecture puts Kafka between ingestion and storage: the ingestion API
validates, anonymises, publishes and returns, and a separate consumer writes to
the database. That keeps bursts from being lost and keeps ingestion fast.

The build plan brings Kafka in at Phase 5. Phase 1 has to store reports without
it, which on its face breaks the rule that ingestion does not write to the
database.

## Decision

Ingestion hands each anonymised report to a `ReportPublisher`. Phase 1 has one
implementation, `DirectReportPublisher`, which passes the report to the reports
feature's `ReportService` within the same request. Ingestion code never touches a
repository, and the reports feature never sees a raw submission.

The value handed over is `AnonymisedReport`, the only shape a report takes after
ingestion. It is what Phase 5 will publish to Kafka, so the boundary is already
where the topic will be.

The ingestion endpoint answers `202 Accepted` with the report's id, not
`201 Created`, because from Phase 5 on the report is stored after the reply.

## Consequences

- In Phase 5 a Kafka publisher replaces `DirectReportPublisher` and the call to
  `ReportService.record` moves into a consumer. Neither the controller, the
  anonymiser nor the API contract changes.
- Until then a slow database slows ingestion, and a database outage fails
  submissions rather than buffering them. Acceptable for a walking skeleton; it
  is the problem Phase 5 exists to solve.
- The report id is generated at ingestion, not by the database, so it can be
  returned before storage and later serve as an idempotency key for the consumer.

## Alternatives considered

- **Bring Kafka forward to Phase 1.** The walking skeleton's purpose is a thin
  slice running end to end first; a broker, topic and consumer would triple its
  moving parts before anything works.
- **Call the repository from ingestion now and refactor later.** Smaller today,
  but it couples ingestion to storage in exactly the way the architecture forbids,
  and Phase 5 would have to untangle it.
