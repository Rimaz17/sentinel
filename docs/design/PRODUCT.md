# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Four audiences, with sharply different needs and access:

- **General public** — a resident of a Sri Lankan district who wants to know whether
  anything unusual is happening near them. No account. Arrives cold, often on a phone,
  often from a search result or a shared link. Has never heard of Sentinel.
- **Healthcare data provider** — staff at a hospital, clinic or pharmacy submitting
  anonymised symptom reports on behalf of their facility. Self-registers, but only with a
  valid facility invite code. Submitting is a repeated chore inside a working shift, not an
  occasion.
- **PHI (public health inspector)** — district or national. Investigates alerts on the
  internal dashboard. Accounts are created by an admin; there is no signup. Works long
  shifts and must not be logged out mid-investigation.
- **System admin** — maintains the facility registry and invite codes, creates PHI
  accounts. Provisioned at setup.

## Product Purpose

An outbreak rarely announces itself at one clinic. It appears as a few extra patients at
each of a dozen places, and each of those numbers is small enough to explain away.
Sentinel keeps the combined view continuously, so a rise is flagged on day three instead of
day ten.

For each of the 25 districts and each symptom group it compares the last 7 days against
that area's own previous 8 weeks, and raises an alert when the count sits more than three
standard deviations above that area's average. Success is a measured detection rate and a
measured median time to detect — not a claim that the system works.

What it is not: it does not diagnose anyone, it counts symptom patterns rather than
confirmed cases, it does not decide what happens next, and it stores no personally
identifying information.

## Positioning

Sentinel compares an area against its own history rather than against other areas. Forty
dengue cases a week is normal for Colombo and highly abnormal for Nuwara Eliya. That
z-score comparison is the basis of established public-health methods such as the CDC's
EARS, and it has a practical advantage: it can be explained to a health officer in one
sentence.

A second, geographic check runs alongside it. DBSCAN clustering on report coordinates
looks for reports bunched within ~2 km arriving from several different facilities. A tight
cluster from many sources suggests a real local outbreak; a rise spread evenly across a
district suggests a wider seasonal wave. The distinction changes the response.

## Operating Context

- The status quo is weekly paper returns reconciled centrally, which is why the combined
  picture currently arrives about a week late.
- Every alert is investigated by a human inspector, who can mark it a false alarm.
- The facility registry is seeded from public Ministry of Health institution data: 1,505
  facilities across all 25 districts, with names, types and coordinates.
- Public and internal views are driven by the same data, but the public view is
  deliberately coarser. The guiding rule: the public should see the pattern, not the
  individuals.
- Two thresholds, deliberately. An inspector sees a watch-level signal immediately. The
  public sees an alert only after an inspector confirms it, or after a higher-confidence
  threshold is crossed — because publishing every fluctuation causes needless alarm and
  erodes trust.

## Capabilities and Constraints

- **Privacy is enforced at the front door.** Name, NIC number, date of birth, phone number
  and home address are removed entirely at the ingestion API. Exact age becomes a 10-year
  band; exact GPS is rounded to ~100 m. District, symptom group, facility ID, timestamp and
  approximate location are kept. Nothing downstream — database, Kafka, backups, logs — ever
  holds personal data.
- **The public view never shows per-report GPS dots.** A dot at a pharmacy's exact
  coordinates can reveal which household got sick. Public geography is district polygons or
  a heatmap only.
- **PHI accounts have no public signup route.** A PHI officer without an account contacts a
  system administrator. The sign-in page says so rather than offering a dead link. No
  contact address is fabricated — the instruction is generic.
- **Data provider registration requires a valid facility invite code**, validated
  server-side. Without a code, registration is not possible at all.
- Stack is fixed by the project: Spring Boot (Java 17) for the API, Python for the
  simulator and detector, Kafka, PostgreSQL + PostGIS, Redis, React + TypeScript + Vite,
  Leaflet with OpenStreetMap/CARTO tiles, Docker Compose, GitHub Actions.
- **Google Maps is not used anywhere, in any phase.** Its terms forbid using its tiles
  outside its own SDK. Leaflet with free OSM/CARTO tiles needs no API key and no billing.
- Machine learning and forecasting are explicitly out of scope.
- Terminology to use exactly: *district* (not region), *symptom group* (not disease),
  *report* (not case), *PHI* on first use expanded to *public health inspector*,
  *baseline*, *alert*, *facility*.

## Brand Commitments

- **Name:** Sentinel. No tagline is fixed yet.
- **Voice:** plain, calm, measured. Internally technical ("Alert A-1001 — 41 reports, 3.2σ
  above baseline, cluster confirmed across 7 facilities"); publicly plain ("Kandy district:
  elevated dengue activity. Follow standard precautions."). Never alarmist, never
  marketing-flavoured. The project documents its own limitations on purpose.
- **Binding visual reference (user-supplied):** a monochrome editorial layout — restrained
  near-white ground, a large geometric sans headline set tight, uppercase letter-spaced
  monospace metadata labels, a thin-ruled outlined button, and one muted ochre accent used
  only on a single data value. This is a pinned aesthetic and is to be honoured, not
  reinterpreted.
  **Correction (2026-09-22):** the reference image as first supplied included a segmented
  plate switcher over a full-bleed photograph. The user has since confirmed that control
  was a capture artefact and is not part of the reference. It is not a design element of
  this project, and no surface should reintroduce it. The landing page carries no hero
  figure at all.
- **Existing project palette** (from the author's own walkthrough document, to stay
  coherent with): ink `#15222B`, paper `#F2F5F5`, amber `#C88A05`, alert red `#E0443E`, and
  per-symptom-group hues dengue `#8B3A8F`, ILI `#2F67B1`, GI `#6E7F1F`, lepto `#12806E`.
- **Framing (confirmed by the user):** the landing page reads as a working system with a
  prominent notice that all case data is simulated. It carries **no author byline** — that
  was removed at the user's request on 2026-09-22. The dataset attribution to Team Watchdog
  stays, because it is owed to the publisher of the facility registry rather than being a
  credit line. Authorship is recorded in the repository README, not on the page.

## Evidence on Hand

- `sentinel-context/Sentinel_Project_Overview.pdf` — the specification. Problem statement,
  detection method, roles, privacy model, tech stack, build plan, success metrics, known
  limitations.
- `sentinel-context/sentinel_walkthrough.html` — a narrative/visual reference by the
  author. Read for tone and palette only; its code is not copied into the product.
- **Real figures that may be cited**, from the current simulation: twelve facilities around
  Kandy normally see 25 dengue-like cases a week between them and saw 87 in the first
  outbreak week, with no single facility seeing more than eleven. A Kandy dengue outbreak
  is detected 50 hours after onset at 41 reports (baseline 25, range 20–30), with 17 reports
  clustered within 2 km across 7 facilities. A widespread Colombo influenza wave is detected
  at 70 hours with no significant cluster.
- **Absences future work must not fabricate:** there are no users, no customers, no
  testimonials, no press, no deployment, no uptime figures, no partner logos and no
  Ministry of Health endorsement. No photography or illustration assets exist. There is no
  live case data of any kind — every number in the system is simulated.

## Product Principles

1. **Show the pattern, not the individuals.** Every public-facing decision resolves toward
   coarser geography and aggregate counts. When in doubt, show less.
2. **Say what is simulated.** The demonstration nature of the data is stated where a visitor
   will actually read it, not in fine print.
3. **Explain the mechanism in one sentence.** The detection method's advantage is that a
   health officer can understand it immediately; the interface should not squander that.
4. **Calm over urgent.** This is a system about outbreaks; alarmist presentation would be
   both distasteful and counterproductive. Restraint is the brand.
5. **Document the limitations.** Simulated data, shared invite codes, 2022 facility data and
   baseline-recalibration weakness are deliberate, disclosed trade-offs — never quietly
   removed.

## Accessibility & Inclusion

- Alerts and severity must never rely on colour alone.
- Semantic HTML, full keyboard navigation, visible focus states, labelled controls and
  sufficient contrast are required, not optional.
- Charts and maps need an accessible fallback — a table or text summary carrying the same
  information.
- Visitors arrive on low-end phones over mobile data; the public entry point must work
  there.
