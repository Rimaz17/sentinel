# 0013, What the public sees, and when an alert is published

Status: accepted · 2026-09-28

## Context

The project overview asks for "two thresholds, deliberately". An inspector sees
every alert at once, because acting early is their job. The public sees an alert
only once an inspector has confirmed it, or once a higher-confidence threshold is
crossed, because publishing every fluctuation causes needless alarm and erodes
trust. The public view is also coarser: district status, trends, published
alerts and general statistics, and never report positions, facility volumes,
investigation notes or data-source problems. Every public endpoint is assumed to
be scraped.

## Decision

- **Inspectors give a verdict.** An alert moves forward only, from new to
  acknowledged to investigating to closed, and takes one final verdict:
  confirmed, or a false alarm, which also closes it. Status and verdict are
  written by targeted updates that touch only their own columns, so they never
  overwrite the detector's figures, and only if the alert is still as the
  inspector last saw it.
- **An alert is public** if an inspector confirmed it, or if no inspector has
  judged it yet and its peak reached **5.0 standard deviations** above baseline.
  A false alarm is never public, however high it ran.
- **Why 5.0.** A peak at or above a threshold during an episode is the same event
  as detection at that threshold, so the detector's own evaluation measures it.
  From `sentinel_detector.evaluation` with seed 2026, the same 600 injected
  outbreaks and 52 quiet weeks as the README's table:

  | Threshold | Detected | at +50% | at +100% | at +200% | False alarms per quiet week |
  |---|---|---|---|---|---|
  | 3.0 sd (internal) | 61% | 28% | 67% | 89% | 3.31 |
  | 4.0 sd | 44% | 11% | 45% | 77% | 0.54 |
  | 5.0 sd | 30% | 3% | 26% | 62% | 0.12 |
  | 6.0 sd | 21% | 1% | 12% | 50% | 0.04 |

  At 5.0 an unconfirmed false alarm reaches the public about once every eight or
  nine weeks nationally, and still more than half of the outbreaks that triple a
  district's usual week are published without waiting for an inspector. 6.0
  would publish half of those. The threshold is a setting,
  `sentinel.alerts.public-threshold`.
- **Plain, calm wording, built on the server.** "Kandy district: elevated
  dengue-like illness activity. Follow standard precautions." An alert that has
  ended reads "... activity is no longer elevated." The only advice is the
  spec's "Follow standard precautions", and to follow the local MOH office's or
  public health inspector's advice; Sentinel offers no medical guidance of its
  own. The public record carries the
  district, the symptom group, whether it is active, the day it was first and
  last flagged in Sri Lanka, and whether an inspector confirmed it or the higher
  threshold published it. It does not carry the alert's code, whose numbering
  would reveal how many alerts were never published, nor any count, baseline,
  z-score, hour or inspector.
- **The public API is three open endpoints under `/api/public`:** every district
  with its status (usual or elevated, with the groups elevated) and its reports
  over the last seven days; nine weeks of reports per symptom group for a
  district or the country; and published alerts from the last 90 days, active
  first. Each may be cached for a minute.
- **A district's week is shown against its own usual week, as a percentage and
  nothing more.** The public dashboard gives each district's last seven days as a
  percentage of the average of the eight weeks before, never as a raw count,
  because counts side by side invite comparing Colombo with Kandy, which the
  detector refuses to do. It never turns that percentage into words such as
  "higher than usual": a rise the public is told about is one an inspector
  confirmed or one past the higher threshold, and words drawn from a looser rule
  would pre-empt both. The weekly trends already published hold the same
  information; the percentage only reads it out plainly.

## Consequences

- The public status of a district can change without an inspector acting, when
  an unjudged alert passes 5.0. That is the overview's design; the evaluation
  above is what it costs.
- The detector may keep extending an alert an inspector has closed, for as long
  as the series stays high. That is the same episode, already judged, and a
  false alarm stays unpublished throughout.
- Weekly counts per district and symptom group are published as they are. At
  district level and a week at a time they identify no one, so no small-number
  suppression is applied; a finer public breakdown would need it.

## Alternatives considered

- **Publish only what an inspector confirms.** Simplest to defend, but a large
  outbreak in a district whose inspector is away would stay invisible to the
  public however clear it became. The overview asks for the second threshold.
- **A lower second threshold (4.0).** Publishes more real outbreaks, but at about
  one unconfirmed false alarm a fortnight, too many for public trust.
- **Show the internal alert list with fields removed.** Easier to build, but one
  forgotten field would leak, and the code's numbering leaks on its own. The
  public records are separate types that have no field to leak into.
