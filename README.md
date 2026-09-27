# Sentinel

A public-health outbreak early-warning system for Sri Lanka. It gathers anonymised
symptom reports from hospitals, clinics and pharmacies, learns what a normal week
looks like for each district, and raises an alert when an area moves well outside
that range.

**All case data in this project is simulated. No real patient data is used.**

---

## Why it exists

An outbreak rarely announces itself at a single clinic. It appears as a handful of
extra patients at each of a dozen different places, and each of those numbers is
small enough to explain away as the rainy season or a virus going round.

Twelve facilities around Kandy normally see 25 dengue-like cases a week between
them. In the first week of a simulated outbreak they see 87, but no single facility
sees more than eleven, and most see six or seven. Nobody on the ground has enough
information to sound an alarm.

Today those numbers are reconciled through weekly paper returns, so the combined
picture arrives about a week after the rise began. Sentinel keeps the combined view
continuously and flags the rise on day three instead of day ten.

## How detection works

For each of the 25 districts and each symptom group, the last 7 days are compared
against that area's own previous 8 weeks. More than three standard deviations above
that area's average raises an alert. Comparing an area against its own history
rather than against other areas matters: 40 dengue cases a week is normal for
Colombo and highly abnormal for Nuwara Eliya.

The check runs every hour. One refinement, adopted because it was measured: the
standard deviation is never taken as less than the square root of the baseline
average, the least a count of independent events varies. Eight weeks are too few
to show that reliably, and without the floor the rule raised three times as many
false alarms. While a series stays high, each hourly check extends the same alert
rather than raising a new one. See
[ADR 0007](docs/adr/0007-detection-v1.md).

A second, geographic check will run alongside it from Phase 6. DBSCAN clustering
on report coordinates looks for reports bunched within ~2 km arriving from several
different facilities. A tight cluster from many sources suggests a real local outbreak; a rise
spread evenly across a district suggests a wider seasonal wave.

## Build status

| Phase | Scope | State |
|---|---|---|
| 1 | Walking skeleton, facility registry, simulator, ingestion API, PostgreSQL | **Built** |
| 2 | Detection v1, z-score baseline job writing alerts | **Built** |
| 3 | Dashboard v1, React + Leaflet, polling | **Built** |
| 4 | Accounts and roles, invite codes, PHI accounts, public dashboard | Not started |
| 5 | Real-time, Kafka, Redis windows, WebSocket alerts | Not started |
| 6 | Geography, PostGIS, DBSCAN, cluster rings | Not started |
| 7 | Ship it, Docker Compose, CI, deployed demo | Not started |
| n/a | **Landing page**, the public entry point at `/` | **Built** |

Phase 1 is the backend's walking skeleton: the facility registry seeded from
Ministry of Health data, a Python simulator posting reports to a Spring Boot
ingestion API, anonymised reports stored in PostgreSQL, and an endpoint listing
recent reports. Phase 2 adds the detector: an hourly Python job that scores every
district and symptom group against its own baseline and writes alerts, and
outbreak injection in the simulator to test it against. Phase 3 adds the
inspector's dashboard at `/app`: the alert queue, every report on a Leaflet map,
the district list, and a weekly chart per symptom group for the country or one
district, all refreshed by polling every 30 seconds. See
[ADR 0009](docs/adr/0009-dashboard-v1-polling-and-figures.md).

The landing page and the internal dashboard are the browser surfaces that exist
today. Every other route renders a page stating which phase it belongs to and
what will live there; see
[ADR 0002](docs/adr/0002-unbuilt-routes-render-placeholders.md).

## Measured detection

Because the simulator decides when each outbreak starts, the detector can be
scored against ground truth. These figures come from an actual run of
`python -m sentinel_detector evaluate` (seed 2026, about 16 seconds): 600
injected outbreaks of 14 days, one of each size and shape in every district and
symptom group, sized as extra reports at their peak relative to that series'
usual week, and 52 weeks of all 100 series with nothing injected. How it works:
[ADR 0008](docs/adr/0008-detector-measured-against-the-simulator.md).

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
report arrives on time. Throughput and end-to-end latency are pipeline figures
and are measured when Kafka arrives in Phase 5.

## Stack

| Layer | Technology |
|---|---|
| API, auth, alerts | Spring Boot (Java 17), Maven |
| Detection, simulation | Python 3.12, pandas, scikit-learn |
| Event stream | Kafka |
| Database | PostgreSQL + PostGIS, Flyway |
| Live counters | Redis |
| Frontend | React + TypeScript + Vite |
| Maps | Leaflet with OpenStreetMap / CARTO tiles |
| Local stack | Docker Compose |
| CI | GitHub Actions |

Google Maps is not used anywhere. Its terms forbid using its tiles outside its own
SDK, which is why it requires billing. Leaflet with free OSM/CARTO tiles needs no
API key and no billing, and PostGIS handles all spatial queries.

## Running the frontend

Requires **Node 20.19+ or 22.12+** (Vite 8).

```bash
cd frontend
npm install
npm run dev
```

The dev server prints a local URL, normally <http://localhost:5173>.

The landing page is entirely static and makes no network requests; it does not
need the backend running.

### Frontend scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Typecheck, then build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | `tsc -b --force` |
| `npm run lint` | ESLint, including `jsx-a11y` |
| `npm run format` | Prettier, write |
| `npm run test` | Vitest, single run |
| `npm run test:watch` | Vitest, watch mode |
| `npm run test:coverage` | Vitest with a v8 coverage report |

## Running the backend

Requires **Docker**, **Java 17** and, for the simulator, **Python 3.12 or later**.
Maven is not needed; the Maven wrapper fetches it.

**1. Start the database.** From the repository root, copy the example settings
(and change the password in `.env`), then start PostgreSQL:

```bash
cp infra/.env.example .env
```

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

It listens on `localhost:5433`, so it does not collide with a PostgreSQL already
installed on the default port.

**2. Start the API.** It reads the repository's `.env`, applies the database
migrations and, on first start, seeds the facility registry. On Windows, use
`mvnw.cmd`.

```bash
cd backend/api
./mvnw spring-boot:run
```

The API listens on <http://localhost:8080>.

**3. Feed it reports.** The simulator uses only Python's standard library. From
`backend/simulator`, fill in nine weeks of history, which is what detection
compares against, then keep reports arriving:

```bash
python -m sentinel_simulator backfill --days 63
```

```bash
python -m sentinel_simulator live
```

A 63-day backfill posts about 10,000 reports. Live mode posts at the simulated
real-time rate, around 1,100 reports a week across the country: about twenty an
hour at a weekday's morning peak and about one an hour overnight, so it is quiet
by design. `--seed N` makes a run repeatable; `--api-url`, or `SENTINEL_API_URL`,
points it at another API.

**4. Look at what arrived.**

```bash
curl "http://localhost:8080/api/reports?limit=5&district=KDY"
```

**5. Run the detector.** It needs pandas and psycopg, and reads the same database
settings as the API, from `.env`. From `backend/detector`:

```bash
pip install -r requirements.txt
```

```bash
python -m sentinel_detector run
```

`run` checks once; `watch` checks at a minute past every hour until stopped. A
check refuses to run until reports reach back 63 days, which the backfill
provides. Alerts are written to the `alerts` table, numbered from `A-1001`, and
appear in the dashboard's alert list within one poll.

### Injecting an outbreak

`--outbreak` adds an outbreak on top of the simulated baseline, timed from now.
To see the detector raise an alert, fill in history with an outbreak that began
four days ago, then check. From `backend/simulator`, then `backend/detector`:

```bash
python -m sentinel_simulator --seed 2026 --outbreak district=KDY,group=DENGUE_LIKE,extra=60,start=-4d,profile=step backfill --days 63
```

```bash
python -m sentinel_detector run
```

In a run of these commands, the check found that outbreak and nothing else:

```
Checked 100 series for the 7 days to 2026-09-27 16:00 UTC: 1 above threshold
  A-1001   new      KDY DENGUE_LIKE         55 reports, 5.2 sd above baseline
```

| Setting | Meaning |
|---|---|
| `district`, `group` | Where, as a district code such as `KDY` and a symptom group such as `DENGUE_LIKE` (required) |
| `extra` | Extra reports a week at the outbreak's peak (required) |
| `start` | Offset from now, such as `-4d` or `12h` (default: now) |
| `days` | How long it lasts (default: 14) |
| `profile` | `ramp` rises to its peak halfway through and falls; `step` is at full strength throughout (default: `ramp`) |
| `spread` | `point` bunches patients within about 2 km of one spot, seen by the nearest few facilities; `wave` spreads them across the district (default: `point`) |

`--outbreak` can be repeated, and works with `live` as well as `backfill`.

### API

| Endpoint | What it does |
|---|---|
| `GET /api/facilities` | The facility registry; `?district=KDY` for one district. A location is null where it could not be verified. |
| `POST /api/ingestion/reports` | Submits a report as the facility named in the `X-Facility-Code` header. Answers `202 Accepted` with the report's id. |
| `GET /api/reports` | Recent reports, newest reported first; `?limit=` 1 to 500 (default 50), `?district=KDY` for one district. |
| `GET /api/reports/locations` | Reports with a location from the last `?days=` 1 to 63 (default 7), newest first, at most 5,000; `?district=KDY` for one district. The map's dots. |
| `GET /api/reports/weekly-counts` | Reports per symptom group in each of the last nine seven-day weeks up to now, oldest first, bucketed as the detector buckets them; `?district=KDY` for one district, the whole country without. |
| `GET /api/districts` | All 25 districts alphabetically, each with its reports over the last seven days and its open alerts. |
| `GET /api/alerts` | Alerts, most recently detected first; `?limit=` 1 to 200 (default 50), `?district=KDY` for one district. `open` is true while an alert is not closed and was detected within the last 24 hours. |

A report as a facility might send it, identity included:

```json
{
  "symptomGroup": "DENGUE_LIKE",
  "reportedAt": "2026-09-27T09:40:00+05:30",
  "age": 37,
  "latitude": 7.2912345,
  "longitude": 80.6337499,
  "patientName": "SIMULATED patient 000001",
  "nicNumber": "SIMULATED-000001",
  "phoneNumber": "SIMULATED-0000000000",
  "homeAddress": "SIMULATED address 000001, KDY"
}
```

What is stored from it is the facility, its district, `DENGUE_LIKE`, the age band
`30-39`, the location `7.291, 80.634` and the two timestamps. The symptom groups
are `DENGUE_LIKE`, `INFLUENZA_LIKE`, `GASTROINTESTINAL` and `LEPTOSPIROSIS_LIKE`.
`dateOfBirth` (`yyyy-mm-dd`) may stand in for `age`; the location is optional.
Errors are [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem details
that name the field at fault and never repeat what was submitted in it.

**Phase 1 has no authentication.** The header names a facility but does not prove
it, and every endpoint is open, including report locations. Keep the API on your
own machine until Phase 4 replaces the header with sign-in; see
[ADR 0004](docs/adr/0004-facility-identity-from-a-header-until-sign-in.md).

### Backend checks

| Command | Run from | What it does |
|---|---|---|
| `./mvnw verify` | `backend/api` | Formatting check, unit tests, and integration tests against a real PostgreSQL started by Testcontainers (needs Docker) |
| `./mvnw spotless:apply` | `backend/api` | Format the Java sources |
| `pip install -r requirements-dev.txt` | `backend/simulator` | Install pytest, Ruff and Black |
| `pytest` · `ruff check .` · `black .` | `backend/simulator` or `scripts/facility-registry` | Test, lint and format either Python project |
| `pip install -r requirements-dev.txt` | `backend/detector` | Install the detector's packages with pytest, Ruff, Black and Testcontainers |
| `pytest` · `ruff check .` · `black .` | `backend/detector` | Test (the integration tests need Docker), lint and format |
| `python -m sentinel_detector evaluate` | `backend/detector` | Measure detection against simulated outbreaks, as in [Measured detection](#measured-detection); `--seed N` for another run |

## Repository layout

```
sentinel/
├── backend/
│   ├── api/               Spring Boot: facility registry, ingestion, reports
│   │   └── src/main/resources/db/migration/   Flyway migrations, the only schema authority
│   ├── detector/          Python: hourly z-score check, alerts, evaluation
│   └── simulator/         Python: simulated reports and outbreaks, backfill and live modes
├── frontend/
│   └── src/assets/        Shipped WebP figures, several widths each
├── infra/
│   ├── docker-compose.yml Local PostgreSQL
│   └── .env.example       Local settings, dummy values; copy to .env at the root
├── docs/
│   ├── adr/               Architecture decision records
│   └── design/
│       ├── PRODUCT.md     Product record
│       ├── DESIGN.md      Design system, written from the built page
│       └── source-images/ Full-resolution originals (archived, not shipped)
├── scripts/
│   ├── build-images.py    Regenerates frontend/src/assets from the originals
│   ├── facility-registry/ Builds the registry seed from the Ministry of Health list
│   └── git-hooks/         commit-msg hook
└── README.md
```

### Regenerating the images

The landing page figures ship as WebP at several widths. To rebuild them after
changing a source image:

```bash
python scripts/build-images.py
```

Needs Pillow (`pip install Pillow`). It reads `docs/design/source-images/` and
writes `frontend/src/assets/`.

## Contributing to this repository

After cloning, point git at the repository's hooks once:

```bash
git config core.hooksPath scripts/git-hooks
```

## Privacy model

Identity is stripped at the ingestion API, the front door, before anything is
written to storage. Nothing downstream, including backups and logs, ever holds
personal data.

| Removed entirely | Generalised | Kept |
|---|---|---|
| Name, NIC number, date of birth, phone number, home address | Exact age → 10-year band; exact GPS → rounded to ~100 m | District, symptom group, facility ID, timestamp, approximate location |

The public view is deliberately coarser than the internal one. A dot plotted at a
pharmacy's exact coordinates can let someone infer which household got sick, even
with no name attached, so public geography is shaded districts or a heatmap ,
never individual reports.

## Known limitations

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
  1,505. See [ADR 0006](docs/adr/0006-facility-locations-verified-before-use.md)
  and [the registry's README](scripts/facility-registry/README.md).
- **No authentication until Phase 4.** A facility names itself in a request
  header, and every endpoint is open. See
  [ADR 0004](docs/adr/0004-facility-identity-from-a-header-until-sign-in.md).
- **Small or gradual outbreaks are caught late or not at all.** At the shipped
  3 sd, an outbreak adding half again to a district's usual week is detected
  28% of the time, and the median time to detect across all injected outbreaks
  is 140 hours, because a 7-day window only fills as an outbreak grows. See
  [Measured detection](#measured-detection).
- **Detection assumes a stable baseline.** A prior year containing a real epidemic
  inflates "normal" and reduces future sensitivity. Periodic recalibration would be
  needed.

## Credits

Rimaz Saththar · BSc (Hons) Computer Science, University of Westminster / IIT Sri
Lanka · 2026.

Facility registry derived from the "Ministry of Health Institutions" dataset
published by Team Watchdog (databank.watchdog.team), sourced from Sri Lanka's
Ministry of Health.
