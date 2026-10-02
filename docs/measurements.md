# Measured results

How well detection, the geographic check and the pipeline perform, from actual
runs. The [README](../README.md#results) quotes the headline figures.

## Measured detection

Because the simulator decides when each outbreak starts, the detector can be
scored against ground truth. These figures come from an actual run of
`python -m sentinel_detector evaluate` (seed 2026, about 16 seconds): 600
injected outbreaks of 14 days, one of each size and shape in every district and
symptom group, sized as extra reports at their peak relative to that series'
usual week, and 52 weeks of all 100 series with nothing injected. How it works:
[ADR 0008](adr/0008-detector-measured-against-the-simulator.md).

| Threshold | Detected | at +50% | at +100% | at +200% | Median hours to detect | False alarms per quiet week |
|---|---|---|---|---|---|---|
| 2.0 sd | 80% | 62% | 85% | 94% | 113 | 13.83 |
| 2.5 sd | 72% | 46% | 78% | 92% | 127 | 6.85 |
| 3.0 sd | 61% | 28% | 67% | 89% | 140 | 3.31 |
| 3.5 sd | 52% | 18% | 55% | 82% | 152 | 1.19 |

The shipped threshold is **3.0 sd**. An outbreak counts as detected if an alert
is raised while it is still going. False alarms are alerts raised nationally,
across all 100 series, in a week with no outbreak anywhere. Two other seeds (1
and 7) gave 62% detected and 3.6 to 3.8 false alarms a week at 3.0 sd.

Kandy dengue-like, where a usual week is about 25 reports, at 3.0 sd:

- +50% at peak, ramp: not detected while it lasted
- +50% at peak, step: not detected while it lasted
- +100% at peak, ramp: detected after 179 hours, at 41 reports in the week
- +100% at peak, step: detected after 33 hours, at 37 reports in the week
- +200% at peak, ramp: detected after 126 hours, at 40 reports in the week
- +200% at peak, step: detected after 45 hours, at 41 reports in the week

What these numbers say: an outbreak that doubles or triples a district's usual
week is usually caught, a step change within a day or two, a slow ramp after
several days; one that adds half again is mostly missed, because it stays
inside ordinary week-to-week variation. Each lower threshold buys detection
with false alarms, which is the trade-off the overview's "two thresholds"
describe. They measure the detector against this simulator, not against real
disease: series are independent, baselines hold no past epidemics, and every
report arrives on time. Throughput and end-to-end latency are pipeline figures;
see [Measured pipeline](#measured-pipeline).

## Measured geography

The simulator also decides whether an outbreak is a point (patients bunched
within about 2 km of one spot, seen by the nearest six facilities) or a wave
(patients spread across the district like its everyday load), so the
geographic check can be scored on what it is for: ringing point outbreaks and
not waves. These figures come from an actual run of
`python -m sentinel_detector evaluate-geography` (seed 2026, about five minutes
on its own): 600 outbreaks of the same sizes and shapes as above, once as
points and once as waves,
with located reports from the simulator's own generator and the real facility
registry, checked every hour as the detector checks; and every alert of 52
quiet weeks. Shares of ringed outbreaks are of those the z-score alerted on,
at 3.0 sd. How it works:
[ADR 0020](adr/0020-geographic-check.md).

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

"Ringed while alerted" counts a ring at any hourly check while the series stayed
flagged; a ring under a wave or a quiet week's false alarm is a false ring. Two
other seeds (1 and 7) gave 79% and 80% of point outbreaks ringed, 2% of waves,
and 0% and 1% of 196 and 179 quiet-week false alarms.

Kandy dengue-like, where a usual week is about 25 reports, at 3.0 sd: every
alerted point outbreak was ringed at its first alert, with 8 to 19 reports
within 2 km from 5 facilities where its usual share of the week was 0.2 to 0.6
reports; no alerted wave was ever ringed.

What these numbers say: when the z-score flags a local outbreak, the map rings
it about four times in five, usually at the first alert, and a district-wide
rise almost never. The misses are mostly in series that usually see only a few
reports a week, where an outbreak large enough to flag is still too few
reports to show four from three facilities in one place. As with detection,
this measures the check against the simulator, whose outbreaks are exactly a
point or a wave and whose reports all have a location.

## Measured pipeline

Two of the overview's success figures are about the pipeline rather than the
detector: the rate it sustains without reports piling up on Kafka, and the
time from a report being submitted to it being stored and counted. These come
from an actual run of `scripts/measure-pipeline` (seed 2026, 30 seconds a
rate, 16 concurrent submitters), with the whole stack on one laptop: an Intel
Core i5-10210U with 16 GB, Windows 11, Docker Desktop given 8 CPUs.

| Target rate | Accepted | Submission round trip, median · 95th | Submitted to stored, median · 95th · slowest | Most waiting on the stream | Sustained |
|---|---|---|---|---|---|
| 25/s | 25.0/s | 20 ms · 31 ms | 20 ms · 31 ms · 144 ms | 1 | yes |
| 50/s | 50.0/s | 19 ms · 27 ms | 18 ms · 26 ms · 81 ms | 2 | yes |
| 100/s | 100.0/s | 15 ms · 28 ms | 16 ms · 108 ms · 337 ms | 15 | yes |
| 150/s | 149.9/s | 13 ms · 33 ms | 19 ms · 550 ms · 1.0 s | 73 | yes |
| 200/s | 200.0/s | 13 ms · 27 ms | 25 ms · 442 ms · 769 ms | 95 | yes |
| 250/s | 249.8/s | 13 ms · 29 ms | 155 ms · 1.9 s · 2.6 s | 231 | yes, just |
| 300/s | 299.8/s | 13 ms · 33 ms | 6.8 s · 17.4 s · 19.0 s | 3,139 | no |

A rate counts as sustained when every report was accepted on time, no more
than a second's worth was still waiting when sending ended, and all were stored
within two seconds after; see
[the measurement's README](../scripts/measure-pipeline/README.md). No report was
refused at any rate, and none went to the dead-letter topic.

What these numbers say: storage, not ingestion, is the limit. Ingestion's
median answer stayed within 20 ms at every rate, and in an earlier run it took
about 490 reports a second from the same 16 submitters; the stream processor,
storing one report at a time on three threads, keeps pace up to about 250 a
second here and falls behind beyond it. An earlier run on the same machine
sustained 200 a second with a median of 281 ms to storage and fell far behind
at 400, so read the limit as 200 to 250 and expect it to vary. The simulated
country sends about 1,100 reports a week, a small fraction of one a second, so
the limit is far above the load; a 63-day backfill from one sequential
submitter runs at about 50 a second.

End to end, a report is stored and counted in its district's seven-day window
about 20 ms after it is submitted, at up to 200 reports a second. The
dashboard then shows it at its next 30-second poll; an alert raised from it is
pushed over WebSocket as the detector commits it.
