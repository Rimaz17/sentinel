# 0018, The simulator runs rolling demo outbreaks by default

Status: accepted · 2026-10-02 · amended 2026-10-02: influenza-like outbreaks are waves

## Context

Left to its baseline, the simulator produces a quiet country: the detector
raises nothing, and the public dashboard tells a visitor that every district is
usual. That is the correct answer for quiet data, but it hides most of what
Sentinel does. The owner asked for some active alerts on the public dashboard
by default.

An alert cannot simply be written into the database. The dashboards show the
reports behind each alert (the weekly chart, the counts, the map), so an alert
with no outbreak under it would contradict the figures beside it. The honest way
to have alerts is to have outbreaks in the simulated data, and let the detector
find them as it would any other.

## Decision

- **The simulator runs a fixed schedule of outbreaks unless told not to**
  (`--quiet`), in both `backfill` and `live`, on top of the baseline and any
  `--outbreak` given. The schedule is `sentinel_simulator.scenario`.
- **A new outbreak every three and a half days, each lasting ten,** at full
  strength throughout ("step"), bunched around one spot ("point"), except the
  influenza-like ones, which spread across their district ("wave"); see the
  amendment below. Each adds
  20 times the square root of its district and group's usual week, rounded:
  +100 a week on Kandy's dengue-like 25, +35 on Colombo's leptospirosis-like 3.
- **Why those numbers.** The detector compares the last 7 days with the 8 weeks
  before them and floors the spread at the square root of the mean, so a full
  week of +20√mean scores about 20. From its eighth day an outbreak's first
  days enter the baseline and its score sinks, so the start of each outbreak
  matters most. Modelled with the detector's own rule: a score of 5 is reached
  after about 1.8 days and kept until about day 10.3; 3 is passed after about a
  day and kept until about day 11.5. With a new outbreak every 3.5 days, at
  least two running outbreaks stand above 5 at every moment. With Poisson noise
  added, 500 simulated first checks published at least two alerts 494 times and
  at least one every time. A run on a fresh stack (63-day backfill, then one
  detector check) published two: Jaffna dengue-like at 14.6 and Kurunegala
  influenza-like at 10.3, with Galle at 4.2 internal only.
- **Published without an inspector.** At these strengths every outbreak passes
  the public threshold of 5 (ADR 0013), so its alert reaches the public
  dashboard with no review, and the demo's nightly reset (ADR 0017), which
  clears verdicts, does not unpublish it. In continuous running each alert is
  public for about ten and a half days, so three or four are at any time.
- **Fixed to the calendar.** Outbreak *n* starts at a fixed time from a fixed
  epoch, so a backfill and a later live run agree on what is running, and each
  outbreak takes its centre from its own number, not from the run's random
  seed, so its reports stay bunched in one place across runs.
- **Rotation.** 24 districts and symptom groups, Colombo's four groups every 21
  days among them (for the demo's Colombo inspector), so a pair recurs only
  every 84 days and its 8-week baseline never holds its own last outbreak.

## Consequences

- The dashboards always have something to show, found by the real detector from
  real (simulated) reports, with figures that agree with the alerts.
- **The measured detection figures are untouched.** `sentinel_detector
  evaluate` builds its own outbreaks and quiet weeks and never calls the
  simulator's command line, and neither does the pipeline measurement.
- A run that needs quiet data, such as reproducing the README's single
  injected outbreak, must say `--quiet`. The README's example does.
- The demo's outbreaks are large and frequent, far above the usual rate of real
  outbreaks; they are there to be seen, and the README says so.
- A database backfilled before this change has no demo outbreaks in its past;
  `live` adds them from the moment it starts, so alerts appear within about two
  days, or at once after a fresh backfill.

## Amendment, 2026-10-02: influenza-like outbreaks are waves

With the geographic check (ADR 0020), an alert whose reports bunch in one place
gets a cluster ring on the inspectors' map, and one whose rise is spread across
its district does not. Were every demo outbreak a point, every demo alert would
be ringed, and a visitor would never see the distinction the check exists to
draw. So the influenza-like outbreaks in the rotation (Kurunegala, Anuradhapura,
Colombo, Badulla, Nuwara Eliya and Vavuniya) are waves, as a seasonal influenza
rise is, and the rest stay points. Strength, timing and rotation are unchanged,
and so is what the z-score sees: where patients live does not change the counts.
