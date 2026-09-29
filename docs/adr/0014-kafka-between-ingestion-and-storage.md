# 0014, Kafka between ingestion and storage

Status: accepted · 2026-09-30

Supersedes [0005](0005-ingestion-stores-directly-until-kafka.md).

## Context

The architecture puts Kafka between the ingestion API and the database, so a
burst of reports or a slow database never loses a report and never slows a
submission. Phase 1 stored each report inside the request instead, behind a
`ReportPublisher` seam, until Phase 5 brought Kafka in (ADR 0005). Phase 5 has
to decide the topic's layout, what a 202 promises, how the consumer stays
correct when Kafka delivers a message more than once, and what happens to a
report that cannot be stored.

## Decision

- **One topic, `sentinel.reports`, keyed by district code.** Kafka hashes the
  key to a partition, so each district's reports stay in order on one
  partition. Six partitions: room for up to six consumers to share the 25
  districts. One replica, because the local stack has one broker. The API
  creates the topic as it starts, and refuses to start without Kafka; the
  broker's own automatic topic creation is off, so a mistyped topic name fails
  rather than quietly creating another.
- **The message is the `AnonymisedReport` as JSON**, written and read by
  `ReportMessages` with a mapper of its own, so nothing the web layer changes
  can change what is on the topic. The record has no field that could hold an
  identity, so neither can the topic. The value travels as bytes, which Kafka's
  and Spring's logging print as an address rather than as content.
- **202 means Kafka has it.** Ingestion sends with `acks=all` and idempotence
  on, and waits for the broker's acknowledgement before it answers. If Kafka
  cannot take the report within about six seconds (`max.block.ms`,
  `request.timeout.ms`, `delivery.timeout.ms`), the answer is 503 and nothing is
  promised. Ingestion never touches the database.
- **The stream processor is a consumer in the API**, group
  `sentinel-report-store`, three threads. It stores each report with
  `insert ... on conflict (id) do nothing`: the id is assigned at ingestion, so
  a message delivered twice is stored once. It notes `stored_at` by the API's
  own clock, the clock that also set `received_at`, so the gap between them is
  the time a report spent on the stream.
- **Failures are sorted into two kinds.** A message that is not a complete
  report, or that the database refuses (a constraint), can never be stored, so
  it goes to `sentinel.reports.dead-letters` at once and the reports behind it
  carry on. Anything else, the database or Redis being down, is retried until
  it succeeds, waiting 0.5 s and doubling up to 30 s. Reports wait on the topic
  meanwhile, in order.

## Consequences

- A database outage no longer fails submissions: reports wait on the topic and
  are stored when it returns. A Kafka outage does fail them, with 503, and the
  simulator stops on the first one and says why.
- Storage happens after the reply. A report shows on the dashboard once the
  stream processor has stored it; the delay is measured in the README.
- An unexpected bug in storing one report stalls its partition, retried every
  30 s, rather than dropping the report. That is visible as growing lag and
  loses nothing, which is the right failure for this data.
- Nothing yet reads the dead-letter topic. A message there waits for a person
  with Kafka's own tools.
- Integration tests run against a real Kafka (Testcontainers), and wait for the
  consumer group to catch up before clearing reports, so one test's reports
  never land in the next.

## Alternatives considered

- **Answer 202 without waiting for Kafka.** Faster, but a report could be
  accepted and then lost if the broker never took it, which is the one thing
  the topic exists to prevent.
- **Retry every failure a few times, then dead-letter it.** Simpler, but a
  database outage longer than the retries would move good reports to the
  dead-letter topic, where nothing stores them.
- **A separate stream-processor service.** The overview draws it as its own
  box. Inside the API it shares the report code and deploys with it; it is
  still a consumer, decoupled by the topic, and can be split out later without
  changing the topic or the message.
- **Twenty-five partitions, one per district.** Hashing does not map one key to
  one partition anyway, and ordering is per key either way.
