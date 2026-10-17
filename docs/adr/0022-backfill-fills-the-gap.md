# 0022, the backfill fills the gap since the latest report

Status: accepted · 2026-10-18

## Context

The full stack's one-shot `simulator-backfill` service ran
`backfill --days 63 --if-empty` ([ADR 0021](0021-full-stack-in-docker-compose.md)):
it posted nine weeks of history on a first start, and skipped if the API already
held any report from those weeks, so a restart never posted a second copy.

That was right for a stack restarted within minutes, and wrong for one left off.
The live simulator posts only while it runs, so a stack stopped on 2 October and
started on 18 October held about 200 reports a day up to the 2nd, none from the
3rd to the 17th, and a trickle from the 18th. The backfill found the older weeks,
skipped, and the dashboards, which show the last seven days, showed almost
nothing: two reports on the map, one in each chart's current week, and no new
alerts, because a week with no reports is not an outbreak. The only remedies were
a hand-run backfill of the right number of days, or `down -v` and a fresh start,
which also deletes every account made by hand.

This is a demonstration system that its owner starts when they want to show it,
sometimes weeks apart. It should look current every time it is started, with no
command to remember.

## Decision

The backfill fills whatever is missing, from the API's latest report up to now.

- **A new option, `--fill-gap`,** replaces `--if-empty`. The simulator asks the
  API when its latest report presented, and posts from then to now. With no
  report, or a latest report older than `--days`, it posts all `--days`, as a
  first start always did. With a latest report from now, it posts nothing.
- **The compose stack runs it on every start:** `backfill --days 63 --fill-gap`.
  Starting the stack from Docker Desktop's start button, or with `up -d`, is
  enough; after a stop of any length the history has no hole by the time the
  live simulator and the detector start, since both still wait for the backfill
  to complete. Started again at once, it finds a few minutes missing and posts
  the few reports those minutes would have had.
- **The API answers with one time, to the report feed alone.**
  `GET /api/ingestion/reports/latest` returns
  `{"reportedAt": "2026-10-17T20:56:26Z"}`, or `null` with no report stored. It
  is open to the `FEED` authority and nothing else: not the public, not data
  providers, not inspectors, not administrators. It names no report, district or
  facility. This widens [ADR 0012](0012-trusted-report-feed.md), under which the
  feed read only the facility registry, by this one time.
- **A report dated ahead of now is passed over.** Ingestion accepts a report up
  to five minutes in the future, for a submitter's clock running fast; counting
  one would make the gap before it look filled.
- **The demo's outbreaks continue across the gap.** Their schedule is fixed to
  the calendar ([ADR 0018](0018-demo-outbreaks-by-default.md)), so the backfill
  posts the parts of each outbreak that fell in the gap, and the detector's first
  check raises the alerts a stack left running would have.

## Consequences

- The dashboards look current after any stop, with no command to run. The stack
  still never posts a second copy: what it posts is only what is missing.
- A start after a long stop takes longer, before the live simulator and the
  detector start. Filling the 16 days from 2 to 17 October 2026 on the
  author's machine posted 3,246 reports in 81 seconds, 40 a second, a little
  below the 50 a second of [measurements](../measurements.md).
- The gap is measured from the latest report of any kind, so only a gap at the
  end is found; a hole behind the latest report is not. A data provider's
  report submitted while the simulator was stopped, with the API running on its
  own, makes the gap before it look filled. In the compose stack the API and
  the simulator start and stop together, so this needs a stack run in pieces.
  A stack started on the old `--if-empty` backfill has its hole behind the live
  reports posted since, so this change does not fill it; it leaves the
  nine-week window nine weeks later. The author's own was filled once by hand,
  posting just its days with the simulator's generator.
- A backfill stopped part way leaves its history up to the latest report it
  stored. Starting the stack again carries on from about there, rather than
  skipping, as `--if-empty` would have. The service is still not restarted on
  failure, so that a failure stops the stack's start and says so.
- Reports still on the Kafka topic when the stack stopped are stored when it
  starts. If the backfill asks before they are stored, the moments they cover
  are posted twice. Only reports posted in the last moments before a stop can
  be waiting, so the overlap is a few reports at most.

## Alternatives considered

- **A fixed demonstration dataset, the same every time.** Either freeze the
  clock at one date, or reload a recorded set shifted to end today. A frozen
  clock puts every real submission in the frozen clock's future, where no
  dashboard shows it. Reloading needs the reports table to tell simulated
  reports from real ones, a schema change, and deletes history on each start.
  Both make the system less like the real one it demonstrates.
- **Read the latest time from the public trends endpoint,** as `--if-empty` read
  its count. It gives weekly totals only, so it could place the gap to within a
  week at best, and would fill a partly empty week twice or not at all.
- **Let the simulator read the database,** as the detector does. It would need
  database credentials it otherwise never holds, and would bypass the API that
  every report enters by.
- **Keep `--if-empty` beside `--fill-gap`.** Nothing would use it, and two
  options that decide whether to post leave a combination to define.
