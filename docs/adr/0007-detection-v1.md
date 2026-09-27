# 0007, Detection v1: the rule, its one refinement, and alert episodes

Status: accepted · 2026-09-27

## Context

The project overview fixes the rule: for each district and symptom group,
compare the last 7 days with that area's previous 8 weeks, and raise an alert
when the current count is more than three standard deviations above their mean.
CLAUDE.md fixes the cadence: the detector runs hourly, as a separate Python job
that reads storage and writes alerts, never called from ingestion.

That leaves several decisions the rule does not settle: exactly which hours a
"week" covers, how the standard deviation is estimated from eight numbers, what
happens when a series stays high for many hourly checks, and what to do before
nine weeks of history exist.

The detector was measured before the rule was settled (see
[ADR 0008](0008-detector-measured-against-the-simulator.md)). Measured as
written, the rule raised **10.4 false alarms a week** across the country's 100
series at 3 sd, with no outbreak anywhere: roughly one false alert per series
every ten weeks. The false alarms were spread across busy and quiet series
alike, so they were not a small-numbers artefact. Two things cause them. A
standard deviation estimated from only eight weekly counts is itself noisy, so
some baselines look unusually steady by chance and make an ordinary week look
extraordinary. And an hourly check of a sliding 7-day window takes many
overlapping looks each week.

## Decision

- **Windows.** A check at time `end` is aligned to the top of the hour (UTC).
  The current week is `[end - 7 days, end)`; the baseline is the eight weeks
  before it, back to `end - 63 days`. Two runs in the same hour see identical
  windows.
- **The rule.** z = (current - mean) / sd, over the eight baseline weeks. An
  alert needs z strictly greater than the threshold, 3 by default.
- **One refinement to the standard deviation.** It is never taken as less than
  the square root of the baseline mean, nor less than one report. A count of
  independent events varies at least that much (a Poisson count's standard
  deviation is the square root of its mean); eight weeks are too few to show it
  reliably. The floor of one report covers series whose mean is below one.
- **Episodes.** Hourly checks of a 7-day window keep a rise above threshold for
  many checks in a row. A detection continues its series' latest alert if that
  alert was last detected within 24 hours, updating its figures and keeping its
  peak; after a longer quiet spell it is a new alert. A check older than an
  alert's last detection changes nothing. Writing is serialised with a
  PostgreSQL advisory lock, so two detectors cannot both raise the same alert.
- **History.** A check refuses to run until reports reach back the full 63 days
  (with a day's grace, because the first report never lands on the exact
  start). Missing weeks would otherwise read as quiet ones and inflate every
  z-score.
- **Ownership.** The detector creates alerts as `NEW` and never changes their
  status. Acknowledging, investigating and closing belong to inspectors, from
  Phase 4.
- **Configuration.** The detector reads the API's own database variables
  (`SENTINEL_DB_URL`, `SENTINEL_DB_USERNAME`, `SENTINEL_DB_PASSWORD`), falling
  back to the repository's `.env`, so the database is configured in one place.
  Its schema comes from the API's Flyway migrations; its tests build their
  database from those same files.

## Consequences

Measured with seed 2026 at 3 sd, the refinement cuts false alarms from **10.4
to 3.3 a week** nationally, and detection of injected outbreaks from **72% to
61%**. Almost all of the lost detections are the smallest outbreaks tested
(+50% of the usual week at peak: 48% to 28% detected); outbreaks tripling the
usual week are still caught 89% of the time (from 92%). It is the better
trade, not just a quieter one: at equal detection (72%) the refined rule has a
third fewer false alarms than the rule as written (6.9 a week at 2.5 sd against
10.4 at 3 sd), and at about equal false alarms it detects more (72% at 6.9 a
week, against 64% at 6.5 for the rule as written at 3.5 sd). It also keeps the
3 sd the landing page promises. Across three seeds (2026, 1 and 7) the refined
rule at 3 sd detected 61% to 62% of outbreaks with 3.3 to 3.8 false alarms a
week.

A side effect: the overview's own worked example now comes out exactly. A
steady Kandy baseline averaging 25 is given a standard deviation of 5, so 41
reports is 3.2 sd.

What remains is honest and documented: small outbreaks are often missed, and
median time to detect is about six days, because a 7-day window only fills as
an outbreak grows. The geographic check in Phase 6 is aimed at exactly the local
outbreaks this misses.

## Alternatives considered

- **The rule exactly as written.** 10.4 false alarms a week at 3 sd would teach
  inspectors to ignore alerts, which is the failure the overview's "two
  thresholds" section warns about.
- **The Poisson floor at 2.5 sd.** The same detection as the rule as written
  (72%) with 6.9 false alarms a week, but the threshold would no longer be the
  3 sd the landing page and the overview state.
- **Requiring several consecutive alerting checks.** Suppresses one-hour spikes
  but delays every detection by the same number of hours, including real ones.
- **A longer baseline.** More weeks would steady the estimate, but the overview
  specifies eight, and a longer window reacts more slowly to real seasonal
  change.
