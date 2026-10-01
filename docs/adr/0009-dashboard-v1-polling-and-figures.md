# 0009, Dashboard v1: polling, and what its figures mean

Status: accepted · 2026-09-28 · alert polling replaced in Phase 5 by a push, see [0016](0016-alerts-pushed-over-websocket.md)

## Context

Phase 3 builds the inspector's dashboard: report dots, a district list, a
per-area chart and an alert list, refreshed by polling. The API had one list of
recent reports and nothing else the dashboard needs, so four endpoints had to be
added, and several questions the build plan does not settle had to be answered:
how often to poll, which seven days a "last seven days" figure covers, when an
alert counts as open, and how the chart relates to what the detector compares.

## Decision

- **Four internal endpoints**, each in its own feature and returning explicit
  response records: `GET /api/districts` (every district with its last seven
  days of reports and its open alerts), `GET /api/alerts` (newest detection
  first, optionally one district), `GET /api/reports/weekly-counts` (nine weeks
  per symptom group, one district or the country) and `GET /api/reports/locations`
  (located reports from the last 1 to 63 days, at most 5,000). All are internal:
  they return report positions and unpublished alerts, and none will be part of
  the public API.
- **Polling every 30 seconds** through TanStack Query, paused while the tab is
  hidden and refetched on return. The facility registry is fetched once and
  never polled, because it changes only by migration. A failed poll keeps the
  last good figures on screen with a note giving their time, rather than
  replacing them with an error.
- **Seven days up to now, not to the detector's last check.** Counts, map dots
  and chart weeks run back from the moment of the request, so a report shows on
  the dashboard within one poll of arriving. The detector's windows end at the
  top of the hour (ADR 0007), so the dashboard's current week can differ from an
  alert's `observedCount` by the reports that arrived since that check. The alert
  keeps its own figures, which are the ones the decision was made on.
- **The chart uses the detector's bucketing.** Week 0 is `[now - 7 days, now)`,
  week 1 the seven days before, back to week 8, computed with the same
  `ceil(...) - 1` expression as the detector. The dashed line is the plain mean of
  the eight baseline weeks. It is deliberately not the alert threshold, which
  also depends on the standard deviation and its floor; drawing that would mean
  reimplementing the detector's rule in the browser.
- **An alert is open** while it is not closed and was last detected within the
  detector's 24-hour episode gap, that is, while the next finding for its series
  would extend it rather than raise a new alert. The API computes `open`; the
  browser does not re-derive it.
- **The district in view is the address:** `/app` for the country and
  `/app/districts/:code` for one district, so a view survives a reload and can be
  shared between inspectors.
- **No hue carries meaning alone.** Open alerts are marked with a red square and
  the word "Open"; the chart is small multiples with every panel named; the map
  has a text summary with counts per group. Running the dataviz palette
  validator over the four fixed symptom-group hues on the paper ground found two
  close pairs: gastrointestinal and leptospirosis-like (ΔE 11 with normal
  vision, under the 15 floor) and dengue-like and influenza-like (ΔE 6.0 with
  deuteranopia). The hues are fixed by the design system, so the map key gives a
  second channel: each group can be taken off the map.
- **The dashboard loads on demand.** Leaflet and the dashboard are split from the
  landing page's bundle, so a member of the public on a phone never downloads a
  map library they do not see.

## Consequences

- Phase 3 has no sign-in. `/app` and the four endpoints are open, like the rest
  of the API since Phase 1 (ADR 0004). The dashboard says so on screen. Phase 4
  puts both behind sign-in and scopes every query to the inspector's districts.
- Polling costs four small requests per open dashboard every 30 seconds. Phase 5
  replaces polling with a WebSocket push for alerts; the query layer is where
  that change lands.
- The current-week figure and an alert's figure can disagree by a handful of
  reports, for the reason above. The alert list shows the alert's own figures,
  labelled as such, and the chart's text says its weeks run back from now.
- A map of more than 5,000 located reports shows the newest 5,000 and says so. A
  normal national week is about 1,100.

## Alternatives considered

- **Align the dashboard to the detector's hour.** Every figure would match the
  latest check exactly, but a report submitted now would not appear for up to an
  hour, and "polling" would refresh nothing most of the time.
- **Compute the threshold in the browser.** The chart could draw the 3σ line,
  but only by duplicating the detector's floor rule in TypeScript, where it could
  drift from the Python it copies.
- **One summary endpoint for the whole page.** Fewer requests, but one slow query
  would hold up every panel, and each panel could no longer load, fail and
  refresh on its own.
