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
| 4 | Accounts and roles, invite codes, PHI accounts, public dashboard | **Built** |
| 5 | Real-time, Kafka, Redis windows, WebSocket alerts | **Built** |
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

Phase 4 adds accounts and roles, and the public view:

- **Sign-in** for staff, with a 15-minute access token and a refresh cookie
  that keeps an inspector signed in through a long shift.
- **Data providers** register only with their facility's invite code, and every
  report they submit is counted as that facility's, whatever the request says.
- **Inspectors** are created by an administrator, who is given a one-time link to
  pass on; there is no sign-up for them. An inspector covers a list of
  districts, or all of them, and the API enforces it in every query: a Kandy
  inspector asking for Colombo gets 403.
- **Inspectors review alerts**: acknowledge, investigate, close, and confirm a
  rise or mark it a false alarm.
- **The public dashboard** at `/dashboard` shows every district's status, weekly
  trends, and alerts in plain words, once an inspector confirms them or a rise
  passes a higher threshold. It never shows a report's position or a facility.

See [ADR 0011](docs/adr/0011-accounts-tokens-and-district-scope.md),
[ADR 0012](docs/adr/0012-trusted-report-feed.md) and
[ADR 0013](docs/adr/0013-public-alerts.md).

Every route in the plan is now built. Until Phase 4 the unbuilt ones said so;
see [ADR 0002](docs/adr/0002-unbuilt-routes-render-placeholders.md).

Phase 5 makes the pipeline real-time:

- **Kafka between ingestion and storage.** Ingestion anonymises a report,
  publishes it to the `sentinel.reports` topic keyed by its district, and
  answers 202 once Kafka has it; a stream processor in the API stores it. A
  report delivered twice is stored once, a database outage leaves reports
  waiting on the topic rather than lost, and a message that can never be stored
  is set aside on a dead-letter topic.
- **Seven-day windows in Redis.** One sorted set per district and symptom group
  holds the last seven days' reports. Each district's figure on the internal
  list and on the public dashboard is read from them, and if Redis loses them
  they are rebuilt from PostgreSQL before the next answer.
- **Alerts pushed over WebSocket.** When the detector raises or extends an
  alert, or an inspector moves one on, the database announces it as the change
  commits, and the API pushes it over STOMP to every inspector whose districts
  cover it, and to nobody else. The dashboard stops polling alerts while the
  socket is open, says so in its header, and polls again while it is not.

See [ADR 0014](docs/adr/0014-kafka-between-ingestion-and-storage.md),
[ADR 0015](docs/adr/0015-seven-day-windows-in-redis.md) and
[ADR 0016](docs/adr/0016-alerts-pushed-over-websocket.md), and
[Measured pipeline](#measured-pipeline) for how fast it runs.

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
report arrives on time. Throughput and end-to-end latency are pipeline figures;
see [Measured pipeline](#measured-pipeline).

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
[the measurement's README](scripts/measure-pipeline/README.md). No report was
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

## Stack

| Layer | Technology |
|---|---|
| API, auth, alerts | Spring Boot (Java 17), Maven |
| Detection, simulation | Python 3.12, pandas, scikit-learn |
| Event stream | Kafka |
| Database | PostgreSQL + PostGIS, Flyway |
| Live counters | Redis |
| Realtime | WebSocket (STOMP) for alert push |
| Frontend | React + TypeScript + Vite, Tailwind CSS, TanStack Query |
| Maps | Leaflet with OpenStreetMap tiles |
| Local stack | Docker Compose |
| CI | GitHub Actions |

Google Maps is not used anywhere. Its terms forbid using its tiles outside its own
SDK, which is why it requires billing. Leaflet with free OpenStreetMap tiles needs
no API key and no billing, and PostGIS handles all spatial queries. CARTO's
basemaps were the first choice but now stamp "API key required" on keyless tiles;
see [ADR 0010](docs/adr/0010-openstreetmap-tiles.md).

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

Every other page needs the API (see [Running the backend](#running-the-backend)).
The dev and preview servers pass every request under `/api` to
<http://localhost:8080>, so the browser only ever talks to its own origin and the
API needs no CORS setting; set `SENTINEL_API_URL` before `npm run dev` to point
them elsewhere.

| Page | Who | What |
|---|---|---|
| `/dashboard` | Anyone | District status, trends and published alerts; no sign-in |
| `/signin` | Staff | One sign-in for data providers, inspectors and the administrator |
| `/register` | Data providers | Registration with a facility invite code |
| `/activate#token=...` | Inspectors | Sets a password from an administrator's one-time link |
| `/submit` | Data providers | Report submission for their own facility |
| `/app`, `/app/districts/KDY` | Inspectors | The internal dashboard, within their districts, with alert review |
| `/app/admin` | Administrator | Inspector accounts, and facility invite codes |

To try it end to end: sign in as the administrator from `.env`, create an
inspector at `/app/admin` and open the link it gives you, then issue a facility a
code under **Facilities and invite codes** and register with it at `/register`.
Alerts reach the internal dashboard over a WebSocket the moment they are raised
or change, and are polled only while it is not open; the header says which.
Every other internal panel polls every 30 seconds while the tab is visible, and
**Refresh now** asks at once. The public dashboard refreshes every minute.

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

**1. Start the database, Kafka and Redis.** From the repository root, copy the
example settings, then start the three. In `.env`, change the database password
and fill in the four Phase 4 settings with real values: `SENTINEL_JWT_SECRET`
and `SENTINEL_FEED_KEY` each from `openssl rand -base64 48`, and an address and
a password of 12 characters or more for the administrator. An `.env` from before
Phase 5 needs the four Kafka and Redis settings added from `infra/.env.example`.

```bash
cp infra/.env.example .env
```

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d
```

PostgreSQL listens on `localhost:5433`, Kafka on `localhost:9094` and Redis on
`localhost:6380`, each one above its usual port, so none collides with one
already installed. Kafka keeps its messages on a volume; Redis keeps nothing on
disk, because the API rebuilds its windows from PostgreSQL
([ADR 0015](docs/adr/0015-seven-day-windows-in-redis.md)).

**2. Start the API.** It reads the repository's `.env`, applies the database
migrations, seeds the facility registry, and on first start creates the
administrator named in `SENTINEL_ADMIN_EMAIL`; it never changes that account
afterwards. It refuses to start without a `SENTINEL_JWT_SECRET` of at least 32
bytes, or without Kafka, whose topics it creates as it starts. On Windows, use
`mvnw.cmd`.

```bash
cd backend/api
./mvnw spring-boot:run
```

The API listens on <http://localhost:8080>.

**3. Feed it reports.** The simulator uses only Python's standard library, and
submits through the API's report feed with the `SENTINEL_FEED_KEY` both of them
read from `.env` ([ADR 0012](docs/adr/0012-trusted-report-feed.md)). From
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
curl "http://localhost:8080/api/public/districts"
```

Internal data needs an inspector's sign-in; the public API needs none.

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

Errors are [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem details
that name the field at fault and never repeat what was submitted in it.

**Public**, open to anyone and cacheable for a minute:

| Endpoint | What it does |
|---|---|
| `GET /api/public/districts` | Every district with its status, `USUAL` or `ELEVATED` with the symptom groups elevated, its reports over the last seven days, its usual week (the average of the eight before) and the one as a percentage of the other. |
| `GET /api/public/alerts` | Published alerts from the last 90 days, active first, in plain wording, with the day each was first and last flagged and whether an inspector confirmed it. |
| `GET /api/public/trends` | Reports per symptom group in each of the last nine weeks; `?district=KDY` for one district. |

**Sign-in**, all `POST`:

| Endpoint | What it does |
|---|---|
| `/api/auth/signin` | Email and password in; an access token and the account out, and a refresh token in an `HttpOnly` cookie. |
| `/api/auth/refresh` | A new access token, and a new refresh cookie in place of the one sent. |
| `/api/auth/signout` | Ends the session the cookie belongs to. |
| `/api/auth/invite-codes/check` | The facility an invite code belongs to. |
| `/api/auth/register` | A data provider account for the code's facility, signed in. |
| `/api/auth/activation/check`, `/api/auth/activate` | Whose activation link this is; set a password from it and sign in. |

`GET /api/auth/me` describes the signed-in account. Sign-in, registration and
activation are limited to 10 requests a minute from one address.

**Data providers** and the **report feed**:

| Endpoint | What it does |
|---|---|
| `POST /api/ingestion/reports` | Submits a report. A data provider's facility is the one in their token; the feed names it in `X-Facility-Code`. Answers `202 Accepted` with the report's id once Kafka has it, and `503` if Kafka cannot take it; the report is stored a moment later. Limited to 120 a minute per data provider. |
| `GET /api/facilities` | The registry, for the feed and for inspectors' maps. |

**Inspectors**, within their districts; anything outside them is 403:

| Endpoint | What it does |
|---|---|
| `GET /api/districts` · `GET /api/districts/{code}` | The districts the inspector covers, each with its reports over the last seven days and its open alerts. |
| `GET /api/alerts` | Alerts, most recently detected first; `?limit=` 1 to 200, `?district=KDY`. `open` is true while an alert is not closed and was detected within the last 24 hours; `published` says whether the public sees it. |
| `POST /api/alerts/{code}/status` | Moves an alert on: `ACKNOWLEDGED`, `INVESTIGATING`, `CLOSED`. Never back. |
| `POST /api/alerts/{code}/verdict` | `CONFIRMED`, which publishes it, or `FALSE_ALARM`, which closes it. Final. |
| `GET /api/reports` | Recent reports, newest reported first; `?limit=` 1 to 500, `?district=KDY`. |
| `GET /api/reports/locations` | Located reports from the last `?days=` 1 to 63 (default 7), at most 5,000; the map's dots. |
| `GET /api/reports/weekly-counts` | Reports per symptom group in each of the last nine weeks, bucketed as the detector buckets them. |

Without `?district=`, an inspector's requests cover every district they may see.
Each district's reports over the last seven days, here and in the public API,
are read from Redis; while Redis cannot be reached those two endpoints answer
`503` and the rest of the API carries on.

**Alerts over WebSocket**, for inspectors
([ADR 0016](docs/adr/0016-alerts-pushed-over-websocket.md)):

| What | How |
|---|---|
| Connect | STOMP over a plain WebSocket at `/api/ws`, from the API's own origin. The CONNECT frame carries `Authorization: Bearer <access token>`; only an inspector's token is accepted. |
| Subscribe | `/user/queue/alerts`, and nothing else. Nothing may be sent. |
| Receive | `{"change": "RAISED" or "UPDATED", "alert": {...}}`, the alert as `GET /api/alerts` returns it, for alerts in the inspector's districts only; or `{"change": "RESYNC", "alert": null}`, read every alert again. Nothing arrives once the token has expired, so reconnect with each renewed token. |

**The administrator:**

| Endpoint | What it does |
|---|---|
| `GET /api/admin/accounts` | Staff accounts; `?role=PHI` for one role. |
| `POST /api/admin/inspectors` | Creates an inspector for `districts`, such as `["KDY"]` or `["*"]`, and returns a one-time activation link's secret. |
| `PATCH /api/admin/accounts/{id}` | Enables or disables an account, or changes an inspector's districts. |
| `POST /api/admin/accounts/{id}/activation` | A new activation link, which is also how a password is reset. |
| `GET /api/admin/facilities` | The registry with each facility's invite status; `?district=KDY`. |
| `POST` / `DELETE /api/admin/facilities/{code}/invite-code` | Issues a facility a new code, shown once, or revokes it. |

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
The submission page at `/submit` never asks for any identity field at all.

### Backend checks

| Command | Run from | What it does |
|---|---|---|
| `./mvnw verify` | `backend/api` | Formatting check, unit tests, and integration tests against a real PostgreSQL, Kafka and Redis started by Testcontainers (needs Docker) |
| `./mvnw spotless:apply` | `backend/api` | Format the Java sources |
| `pip install -r requirements-dev.txt` | `backend/simulator` | Install pytest, Ruff and Black |
| `pytest` · `ruff check .` · `black .` | `backend/simulator` or `scripts/facility-registry` | Test, lint and format either Python project |
| `pip install -r requirements-dev.txt` | `backend/detector` | Install the detector's packages with pytest, Ruff, Black and Testcontainers |
| `pytest` · `ruff check .` · `black .` | `backend/detector` | Test (the integration tests need Docker), lint and format |
| `python -m sentinel_detector evaluate` | `backend/detector` | Measure detection against simulated outbreaks, as in [Measured detection](#measured-detection); `--seed N` for another run |
| `python measure_pipeline.py` | `scripts/measure-pipeline` | Measure throughput and latency against a running stack, as in [Measured pipeline](#measured-pipeline); it adds reports, so use a throwaway one. See [its README](scripts/measure-pipeline/README.md) |
| `pytest` · `ruff check .` · `black .` | `scripts/measure-pipeline` | Test, lint and format the measurement |

## Repository layout

```
sentinel/
├── backend/
│   ├── api/               Spring Boot: accounts and sign-in, facility registry and invite
│   │                      codes, ingestion onto Kafka, the stream processor storing
│   │                      reports, the Redis windows, districts, alerts and their
│   │                      WebSocket push, administration, and the public API
│   │   └── src/main/resources/db/migration/   Flyway migrations, the only schema authority
│   ├── detector/          Python: hourly z-score check, alerts, evaluation
│   └── simulator/         Python: simulated reports and outbreaks, backfill and live modes
├── frontend/
│   └── src/
│       ├── assets/        Shipped WebP figures, several widths each
│       └── features/
│           ├── landing/   The public landing page at /
│           ├── public/    The public dashboard at /dashboard, and the district outlines
│           ├── auth/      Sign-in, registration, activation, the session and route guards
│           ├── submit/    Report submission for data providers
│           ├── admin/     Inspector accounts and facility invite codes
│           └── dashboard/ The internal dashboard at /app: alert list and review,
│                          district list, Leaflet map, weekly chart, and the alert socket
├── infra/
│   ├── docker-compose.yml Local PostgreSQL, Kafka and Redis
│   └── .env.example       Local settings, dummy values; copy to .env at the root
├── docs/
│   ├── adr/               Architecture decision records
│   └── design/
│       ├── PRODUCT.md     Product record
│       ├── DESIGN.md      Design system, written from the built page
│       └── source-images/ Full-resolution originals (archived, not shipped)
├── scripts/
│   ├── build-images.py    Regenerates frontend/src/assets from the originals
│   ├── district-boundaries/ Builds the public map's district outlines from geoBoundaries
│   ├── facility-registry/ Builds the registry seed from the Ministry of Health list
│   ├── measure-pipeline/  Measures the pipeline's throughput and latency
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
- **The report feed can submit as any facility.** The simulator needs it to
  stand in for over 800 facilities at once. It is off unless `SENTINEL_FEED_KEY`
  is set, and a real deployment would give each integration its own key scoped
  to its facilities. See [ADR 0012](docs/adr/0012-trusted-report-feed.md).
- **An access token cannot be revoked.** Disabling an account or narrowing an
  inspector's districts takes effect at the next session renewal, at most 15
  minutes later.
- **Rate limits are counted in memory, per client address.** A restart forgets
  them, and behind a reverse proxy every visitor shares the proxy's address.
- **Invite codes are stored as SHA-256 hashes.** Registration has to find the
  facility by its code, so they cannot use BCrypt; a copy of the table would let
  codes of about 35 bits be recovered offline.
- **Sentinel sends no email.** An administrator passes an inspector's activation
  link, and a facility its invite code, by hand.
- **Public alerts can appear without an inspector.** An unjudged alert whose rise
  passes 5 standard deviations is published on that alone, about one false
  alarm every eight or nine weeks nationally. See
  [ADR 0013](docs/adr/0013-public-alerts.md).
- **District outlines are OpenStreetMap data from 2017**, via geoBoundaries,
  simplified for a map. They shade districts; they never decide which district a
  report belongs to.
- **Map tiles depend on OpenStreetMap's tile server,** whose usage policy suits a
  demonstration but not production traffic. See
  [ADR 0010](docs/adr/0010-openstreetmap-tiles.md).
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
  [Measured pipeline](#measured-pipeline).
- **The local Kafka is a single broker**, so each message is kept once. The
  topic survives a restart of the broker, not the loss of its disk.
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
