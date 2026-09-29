# 0015, Seven-day windows in Redis

Status: accepted · 2026-09-30

## Context

The overview gives Redis one job: live counters, one sorted set per district
and symptom group holding the last seven days. The internal district list and
the public dashboard both show each district's reports over the seven days up
to now (ADR 0009), and until Phase 5 each request counted them in PostgreSQL.
Phase 5 has to decide what the sets hold, which figures read them, and what
happens when Redis loses them, since Redis is fast precisely because it keeps
everything in memory.

## Decision

- **One sorted set per district and symptom group**, keyed
  `sentinel:window:KDY:DENGUE_LIKE`. Each member is a report's id and its score
  is when the patient presented, in microseconds since the epoch: PostgreSQL's
  own precision, and exact in a double. A count for any stretch of the last
  week is a range count, so a window is exact at any moment rather than
  bucketed by hour or day.
- **The stream processor adds each report after its row commits**, and drops
  whatever has aged out of that set as it goes. Adding a report twice leaves it
  counted once. A report that presented more than seven days ago is not added.
  If Redis cannot be reached after the commit, the failure is thrown, the
  stream processor retries the report, which is stored as it was and added
  again.
- **Two figures read the windows:** each district's reports over the last
  seven days on the internal district list (`GET /api/districts`), and the same
  figure on the public dashboard (`GET /api/public/districts`), so the two
  always agree. The usual week and the nine-week charts stay in PostgreSQL,
  which holds the history; so does the detector, which needs nine weeks.
- **Redis is never the only copy, and knows when it is incomplete.** A key,
  `sentinel:window:complete`, is set only once the windows have been rebuilt
  from PostgreSQL. A Redis that restarts or is emptied loses it with everything
  else. Each count checks it in the same Lua script as the counts themselves,
  so a Redis emptied part-way can never be half seen; if it is missing, the
  windows are rebuilt from the last seven days of stored reports and counted
  again. A rebuild marks the windows complete only if the token it set at the
  start is still there, so a Redis emptied during the rebuild is caught too.
- **Redis keeps nothing on disk** in the local stack (`--save ""`,
  `--appendonly no`). A Redis restored from an old snapshot would carry the
  complete marker but miss every report added since, and count too few for up
  to a week. A Redis that starts empty is always rebuilt.
- **Redis being down is 503**, with "The figures are unavailable right now",
  for the district figures; the rest of the API carries on. The client gives up
  after two seconds rather than its default minute.

## Consequences

- A new report counts in its district's figures as soon as it is stored, with
  no query over the reports table on each request.
- The windows hold one week of report ids, about 1,100 at the simulated
  national rate. Measured on the local stack: 1,120 reports in 96 keys took
  66 KB of Redis memory.
- While Redis is down, the stream processor retries each report until it
  returns, so storage waits with it. Nothing is lost; the map dots, which come
  from PostgreSQL, stop moving meanwhile.
- A second API instance shares the same windows and the same marker. Two
  rebuilding at once both write the same members, which is harmless.

## Alternatives considered

- **Keep counting in PostgreSQL.** Correct and simple at this scale, but the
  overview puts live counters in Redis, and a count per request over a growing
  table is what the windows avoid.
- **A counter per district and day (INCR).** Smaller, but counts only whole
  days, can count a retried report twice, and cannot be checked against the
  store report by report.
- **Rebuild only when the API starts.** Misses a Redis that restarts while the
  API runs, which would then count too few until the next restart.
- **Persist Redis to disk.** A restored snapshot would look complete while
  missing recent reports; rebuilding from PostgreSQL is both simpler and right.
