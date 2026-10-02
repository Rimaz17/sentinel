# Known limitations

These are documented on purpose and are not defects.

- **Simulated data.** Every case report is generated. A real deployment would
  require Ministry of Health integration and ethical approval.
- **Shared invite codes.** One code per facility means a leaked code could be
  reused. A production system would add per-user verification.
- **Facility data is from 2022.** Some facilities may since have opened, closed or
  been renamed.
- **Only 817 of the 1,501 facilities have a location.** The source coordinates
  were machine geocoded and many are wrong, so a location is kept only where it
  passes verification. The registry holds 1,501 facilities rather than the 1,505
  the project overview quotes, because no principled filter of the source gives
  1,505. See [ADR 0006](adr/0006-facility-locations-verified-before-use.md)
  and [the registry's README](../scripts/facility-registry/README.md).
- **The report feed can submit as any facility.** The simulator needs it to
  stand in for over 800 facilities at once. It is off unless `SENTINEL_FEED_KEY`
  is set, and a real deployment would give each integration its own key scoped
  to its facilities. See [ADR 0012](adr/0012-trusted-report-feed.md).
- **An access token cannot be revoked.** Disabling an account or narrowing an
  inspector's districts takes effect at the next session renewal, at most 15
  minutes later.
- **Rate limits are counted in memory, per client address.** A restart forgets
  them. Behind the full stack's web container, each visitor is counted by the
  address in `X-Forwarded-For`, which the API trusts from a private network
  address only; a TLS proxy in front of a deployed demo must put the visitor's
  real address last in that header, as Caddy and Cloudflare do. See
  [ADR 0021](adr/0021-full-stack-in-docker-compose.md).
- **Invite codes are stored as SHA-256 hashes.** Registration has to find the
  facility by its code, so they cannot use BCrypt; a copy of the table would let
  codes of about 35 bits be recovered offline.
- **Sentinel sends no email.** An administrator passes an inspector's activation
  link, and a facility its invite code, by hand.
- **Public alerts can appear without an inspector.** An unjudged alert whose rise
  passes 5 standard deviations is published on that alone, about one false
  alarm every eight or nine weeks nationally. See
  [ADR 0013](adr/0013-public-alerts.md).
- **District outlines are OpenStreetMap data from 2017**, via geoBoundaries,
  simplified for a map. They shade districts; they never decide which district a
  report belongs to.
- **Map tiles depend on OpenStreetMap's tile server,** whose usage policy suits a
  demonstration but not production traffic. See
  [ADR 0010](adr/0010-openstreetmap-tiles.md).
- **Only alerts are pushed.** An alert reaches the internal dashboard over
  WebSocket as it commits, but a new report's dot and count appear at the next
  30-second poll.
- **Nothing reads the dead-letter topic.** A message the stream processor could
  never store waits on `sentinel.reports.dead-letters` for a person with
  Kafka's own tools. None arrived in any run measured here.
- **While Redis is down, storage waits for it.** The stream processor retries
  each report until Redis returns; nothing is lost, but the map stops moving
  and the district figures answer 503 meanwhile.
- **Storage keeps pace to about 200 to 250 reports a second** on the laptop
  measured, storing one report at a time. Far above the simulated load; a
  real national feed would want reports stored in batches first. See
  [Measured pipeline](measurements.md#measured-pipeline).
- **The local Kafka is a single broker**, so each message is kept once. The
  topic survives a restart of the broker, not the loss of its disk.
- **The demo's outbreaks are not realistic.** They are large, frequent and
  regular so that the dashboards always have alerts to show; the
  [measured figures](measurements.md) are measured without them. See
  [ADR 0018](adr/0018-demo-outbreaks-by-default.md).
- **Small or gradual outbreaks are caught late or not at all.** At the shipped
  3 sd, an outbreak adding half again to a district's usual week is detected
  28% of the time, and the median time to detect across all injected outbreaks
  is 140 hours, because a 7-day window only fills as an outbreak grows. See
  [Measured detection](measurements.md#measured-detection).
- **Small local outbreaks may get no ring.** A cluster needs at least four
  reports from three facilities in one place, so in a series that usually sees
  a few reports a week a local outbreak is ringed only once it has grown, if
  at all; and a wave is, rarely, ringed by chance. See
  [Measured geography](measurements.md#measured-geography).
- **A ring describes the week, not the outbreak's edge.** It is drawn at 2 km
  around the centre of the bunched reports, rounded to about 110 m, and counts
  only reports with a location from the alert's own district, so an outbreak
  across a district boundary is seen as two, or by one side only.
- **The database needs PostGIS.** A PostgreSQL without the extension cannot
  run Sentinel from Phase 6. See [ADR 0019](adr/0019-postgis.md).
- **Demo mode is on by default**, so its accounts and its nightly reset come
  with every run unless `SENTINEL_DEMO_MODE=false`.
- **Demo mode undoes alert reviews and leaves reports.** Its nightly reset
  returns every alert to new, the owner's reviews included, because a status
  change is not recorded against an account; and it cannot remove a visitor's
  reports, because a report carries no account by design. Both are simulated.
  See [ADR 0017](adr/0017-public-demo-mode.md).
- **The demo administrator sees every account's name and email** until the
  nightly reset, so the demo's pages ask visitors for made-up details.
- **The full stack serves plain HTTP.** The refresh cookie is `Secure`, which
  browsers accept over HTTP from `localhost` only, so a demo reached any other
  way needs HTTPS in front of the site's port, or every visitor is signed out
  when their 15-minute access token ends.
- **A stack stopped for days keeps a gap in its reports.** On a restart the
  simulator posts from that moment, and the backfill sees recent history and
  skips, so the baseline holds too few reports until the gap leaves the
  nine-week window. Start afresh with `down -v` after a long stop.
- **The official PostGIS image is built for x86-64 only.** On an ARM machine,
  `SENTINEL_POSTGIS_IMAGE` swaps in a build for both from one of its
  maintainers; every other image is published for both.
- **Images are built in CI, not published.** Nothing pulls them yet, so a
  deployment builds them from the repository.
- **Detection assumes a stable baseline.** A prior year containing a real epidemic
  inflates "normal" and reduces future sensitivity. Periodic recalibration would be
  needed.
