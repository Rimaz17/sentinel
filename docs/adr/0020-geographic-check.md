# 0020, The geographic check: DBSCAN proposes, a 2 km ring decides

Status: accepted · 2026-10-02

## Context

The z-score (ADR 0007) says a district and symptom group is running high. It
cannot say whether the extra reports come from one neighbourhood or from the
whole district, and the response differs: a local outbreak sends an inspector
to one place, a seasonal wave calls for district-wide advice. The overview asks
for a second check that uses DBSCAN on report coordinates to find reports
"bunched within ~2 km of each other and arriving from several different
facilities", run "on recent points for flagged series", with 2 km rings on the
inspectors' map.

Taken literally, that rule fails on Sentinel's own data. Every report is placed
near the facility its patient went to, so reports bunch around every busy
hospital every week, from several facilities wherever hospitals are close
together, as in central Colombo. A prototype over the simulator's own reports
and the real facility registry, with DBSCAN and the facility rule alone, found
"clusters" in 16% of quiet weeks of the busiest series (a usual week of 25 or
more) at a 1 km neighbourhood, and, at 0.75 km, under 19% of flagged seasonal
waves in those series at their first alert and 31% at some hour while they
stayed flagged. Density alone is not a local outbreak; density above what that
place usually holds is.

## Decision

- **Only flagged series, only their current week.** At every hourly check, for
  each alert the check raises or extends, the detector reads that district and
  symptom group's located reports from the same seven days. Nothing runs for a
  series the z-score did not flag, and the check is never called from
  ingestion.
- **DBSCAN proposes places.** scikit-learn's DBSCAN with the haversine metric,
  a neighbourhood of 1 km and at least 4 reports. Each group it finds gives a
  centre: the mean of its reports' positions, rounded to three decimal places
  as report locations are.
- **A 2 km ring around each centre decides.** PostGIS counts, within 2 km, the
  series' reports this week, the facilities they came from, and the series'
  reports in the eight weeks before (ADR 0019). A ring is a cluster when:
  - its reports this week come from **at least 3 facilities**: one facility's
    patients bunch around it every week, and a single source could be one
    clinic's data problem; and
  - it holds **far more than its usual share**: given all the reports the ring
    held over the nine weeks, this week's are a binomial draw at this week's
    share of the series if the ring is ordinary, and a cluster's count must
    run **more than 3 standard deviations** above that, the z-score's own
    threshold. The spread is never taken as less than one report.
- **One place is reported once.** Two passing rings whose centres lie within 2
  km of each other are one place, kept from the stronger.
- **Stored under the alert, replaced at each check.** `alert_clusters` (V17)
  holds each ring: centre, radius, reports, facilities, the count it would
  hold at its share of the baseline weeks, and the nearest located facility in
  the district. That count is the plain figure an inspector reads the ring
  against, this week's reports times the ring's baseline share; the test's own
  expectation, which conditions on everything the ring held, is pulled up by
  the outbreak under test and would read as a strangely large "expected". The alert
  records when the check last looked (`clusters_checked_at`), so "no cluster"
  and "never looked" are told apart. Both are written in the transaction that
  writes the alert, so the WebSocket push (ADR 0016) carries them.
- **Internal only.** The internal alert API and its push carry the clusters.
  The public API never reads the table: a 2 km ring at a centre rounded to
  110 m is far finer than the district shading the public sees.
- **Measured, not asserted.** `python -m sentinel_detector evaluate-geography`
  runs the production check over located reports from the simulator's own
  generator and the real registry: every district and symptom group at three
  sizes, two profiles and both spreads (1,200 outbreaks), checked every hour as
  the detector checks, and the false alarms of 52 quiet weeks.

## Why these settings

Chosen on the simulator before the evaluation was written, then measured:

- **The concentration test is what separates waves from local outbreaks.**
  Without it, the busiest series ring under seasonal waves often (above). A
  first version compared the ring's count with its baseline share applied to
  this week, as if that share were known exactly. Over the full evaluation
  that rang 4% of alerted waves; the binomial form, which allows for the
  baseline weeks being few, rang 1%, for 3 points fewer point outbreaks ringed
  (82% to 79%).
- **1 km and 4 reports.** In the prototype, with the concentration test in
  place, a 1 km neighbourhood rang slightly more flagged point outbreaks than
  0.75 km, with no more false rings, and a minimum of 5 reports slightly fewer.
  The samples were small (about 20 flagged outbreaks per case), so these
  settings are reasonable rather than optimal; the full evaluation below is
  what they are judged by.
- **2 km** is the overview's figure, and fits the simulator's point outbreaks,
  whose patients live within about 2 km of one spot.

## Measured

From `evaluate-geography`, seed 2026; shares of ringed outbreaks are of those
the z-score alerted on at 3.0 sd:

| Outbreak | Alerted | Ringed at first alert | Ringed while alerted | Median hours, alert to ring |
|---|---|---|---|---|
| Point | 60% | 65% | 79% | 0 |
| Point at +50% | 34% | 47% | 60% | 0 |
| Point at +100% | 58% | 72% | 81% | 0 |
| Point at +200% | 88% | 67% | 85% | 0 |
| Wave | 64% | 0% | 1% | 34 |
| Wave at +50% | 36% | 0% | 1% | 24 |
| Wave at +100% | 66% | 0% | 1% | 152 |
| Wave at +200% | 89% | 1% | 2% | 34 |
| False alarm, quiet weeks | 161 alerts | n/a | 0% | n/a |

Seeds 1 and 7 gave 79% and 80% of alerted point outbreaks ringed, 2% of alerted
waves, and 0% and 1% of quiet weeks' false alarms. A point outbreak that is
ringed is usually ringed at its first alert. Most misses are in series that
usually see a few reports a week, where an outbreak large enough to flag is
still too small to show four reports from three facilities in one place.

## Consequences

- An inspector sees where to go: a ring on the map named by its alert, the
  same in words in the map's key and under the alert, with the nearest
  facility.
- A ring can be missing under a real local outbreak while it is small: a
  series that usually sees two or three reports a week cannot show four
  reports from three facilities until the outbreak has grown. And a ring can
  appear under a wave, rarely, by chance; the check counts that as a false ring
  and the evaluation measures it.
- Each hourly check makes one PostGIS query per proposed place, and a handful
  of places at most per flagged series. A few flagged series a week is far
  below anything that would need tuning.
- Rings move a little from hour to hour as the week's reports change, and
  vanish when the alert ends. The stored rings describe the alert's latest
  check only, not its history.
- The figures measure the check against the simulator, where outbreaks are
  exactly point or wave and every report has a location. Real outbreaks are
  messier, and real reports sometimes have none.
