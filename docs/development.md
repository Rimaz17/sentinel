# Developing Sentinel

How to run each part of Sentinel on its own, check it, and find your way
around the repository. To start the whole system in containers instead, see
[Run it](../README.md#run-it).

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
With the API in demo mode, the sign-in and registration pages offer the demo
accounts and the demo invite code instead (step 6 of
[Running the backend](#running-the-backend)).
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

Each part runs on the host from its own terminal. Requires **Docker**, **Java 17** and, for the simulator, **Python 3.12 or later**.
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

Without `--profile app`, this starts those three only, as before Phase 7.
PostgreSQL listens on `localhost:5433`, Kafka on `localhost:9094` and Redis on
`localhost:6380`, each one above its usual port, so none collides with one
already installed. The database is PostgreSQL 17 with PostGIS
(`postgis/postgis:17-3.5-alpine`). A database started before Phase 6 on the
plain image keeps its data: the same command recreates the container on the
new image, and the API's next start adds PostGIS to it. Kafka keeps its messages on a volume; Redis keeps nothing on
disk, because the API rebuilds its windows from PostgreSQL
([ADR 0015](adr/0015-seven-day-windows-in-redis.md)).

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
read from `.env` ([ADR 0012](adr/0012-trusted-report-feed.md)). From
`backend/simulator`, fill in nine weeks of history, which is what detection
compares against, then keep reports arriving:

```bash
python -m sentinel_simulator backfill --days 63
```

```bash
python -m sentinel_simulator live
```

A 63-day backfill posts about 12,000 reports. Live mode posts at the simulated
real-time rate, around 1,100 reports a week across the country on the baseline:
about twenty an hour at a weekday's morning peak and about one an hour
overnight. `--seed N` makes a run repeatable; `--api-url`, or `SENTINEL_API_URL`,
points it at another API.

**The demo's outbreaks run by default**, so the dashboards always have alerts to
show ([ADR 0018](adr/0018-demo-outbreaks-by-default.md)). On top of the
baseline, a new outbreak starts every three and a half days and lasts ten, each
far enough above its district's usual week that the detector publishes it
without an inspector. Most are bunched around one spot, so they get a cluster
ring; the influenza-like ones are spread across their district, as a seasonal
wave is, so they do not, so after a backfill and one check two or three alerts are
active on the public dashboard. They are far larger and more frequent than real
outbreaks, on purpose. `--quiet` leaves them out, for the baseline alone; a
backfill from before this change has none in its past, so start a fresh one, or
let `live` run for about two days.

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

It also needs scikit-learn, for DBSCAN. `run` checks once; `watch` checks at a
minute past every hour until stopped. A
check refuses to run until reports reach back 63 days, which the backfill
provides. Alerts are written to the `alerts` table, numbered from `A-1001`, and
appear in the dashboard's alert list within one poll.

**6. Demo mode, on by default.** So visitors can try the staff side without an
account ([ADR 0017](adr/0017-public-demo-mode.md)), the API runs in demo
mode unless `.env` says otherwise. These are the defaults; change the password
and code if you like (the password needs 12 characters or more), or set
`SENTINEL_DEMO_MODE=false` to switch demo mode off:

```
SENTINEL_DEMO_MODE=true
SENTINEL_DEMO_PASSWORD=sentinel-demo
SENTINEL_DEMO_INVITE_CODE=CMB-DEM-7Q4X
```

Both values are shown to every visitor, so reuse neither. At each start the API
creates or puts back the four demo accounts, all signing in with that password:

| Account | Email | Reaches |
|---|---|---|
| Administrator | `admin@demo.sentinel.test` | All of administration, held back from what would break the demo |
| Inspector, every district | `inspector.national@demo.sentinel.test` | The internal dashboard for all 25 districts |
| Inspector, Colombo | `inspector.colombo@demo.sentinel.test` | Colombo only; Kandy answers 403 |
| Data provider | `records.idh@demo.sentinel.test` | Report submission for the Infectious Diseases Hospital, Angoda |

The invite code is the same hospital's. Every night at 03:00 Sri Lanka time the
API deletes the accounts visitors made, removes the invite codes the demo
administrator issued, returns every alert to new, and puts the demo accounts and
code back. Accounts you made are never touched, but alert reviews are undone,
so switch demo mode off on a database whose reviews you want to keep.

### Injecting an outbreak

`--outbreak` adds an outbreak of your own on top of the simulated baseline,
timed from now. To see the detector raise an alert for it alone, fill in
history with an outbreak that began four days ago and `--quiet`, so the demo's
outbreaks stay out, then check. From `backend/simulator`, then
`backend/detector`:

```bash
python -m sentinel_simulator --seed 2026 --quiet --outbreak district=KDY,group=DENGUE_LIKE,extra=60,start=-4d,profile=step backfill --days 63
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

### Backend checks

| Command | Run from | What it does |
|---|---|---|
| `./mvnw verify` | `backend/api` | Formatting check, unit tests, and integration tests against a real PostgreSQL with PostGIS, Kafka and Redis started by Testcontainers (needs Docker) |
| `./mvnw spotless:apply` | `backend/api` | Format the Java sources |
| `pip install -r requirements-dev.txt` | `backend/simulator` | Install pytest, Ruff and Black |
| `pytest` · `ruff check .` · `black .` | `backend/simulator` or `scripts/facility-registry` | Test, lint and format either Python project |
| `pip install -r requirements-dev.txt` | `backend/detector` | Install the detector's packages with pytest, Ruff, Black and Testcontainers |
| `pytest` · `ruff check .` · `black .` | `backend/detector` | Test (the integration tests need Docker), lint and format |
| `python -m sentinel_detector evaluate` | `backend/detector` | Measure detection against simulated outbreaks, as in [Measured detection](measurements.md#measured-detection); `--seed N` for another run |
| `python -m sentinel_detector evaluate-geography` | `backend/detector` | Measure the geographic check against point and wave outbreaks, as in [Measured geography](measurements.md#measured-geography); a few minutes |
| `python measure_pipeline.py` | `scripts/measure-pipeline` | Measure throughput and latency against a running stack, as in [Measured pipeline](measurements.md#measured-pipeline); it adds reports, so use a throwaway one. See [its README](../scripts/measure-pipeline/README.md) |
| `pytest` · `ruff check .` · `black .` | `scripts/measure-pipeline` | Test, lint and format the measurement |
| `python smoke_test.py` | `scripts/smoke-test` | Check a running full stack through its site; `--base-url` for another port, `--alert-timeout 0` to skip waiting for alerts |

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and every push to `main`.
A red build is never merged.

| Job | What it checks |
|---|---|
| Frontend | Typecheck, lint, formatting, tests and the production build |
| API | `./mvnw verify`: Spotless, unit tests, and integration tests against real PostgreSQL with PostGIS, Kafka and Redis started by Testcontainers |
| Python | Ruff, Black and pytest for the simulator, the facility registry build and the pipeline measurement; Ruff and Black for the smoke test |
| Detector | Ruff, Black and pytest, with Testcontainers |
| Images and full stack | Builds the four images, with layers cached between runs, starts the whole stack from them on the example settings, and runs `scripts/smoke-test` against it: the site and a deep link, the public API through the proxy, the alert socket's origin check both ways, district scope both ways, and the detector's first alerts from the simulated history |

The images are built from `infra/docker/`, one Dockerfile each, from the
repository root. They are not pushed to a registry.

## Repository layout

```
sentinel/
├── backend/
│   ├── api/               Spring Boot: accounts and sign-in, facility registry and invite
│   │                      codes, ingestion onto Kafka, the stream processor storing
│   │                      reports, the Redis windows, districts, alerts and their
│   │                      WebSocket push, administration, the public API, and
│   │                      demo mode
│   │   └── src/main/resources/db/migration/   Flyway migrations, the only schema authority
│   ├── detector/          Python: hourly z-score check, alerts, DBSCAN cluster check,
│   │                      and the evaluations of both
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
│           ├── demo/      The demo accounts and invite code panels, in demo mode
│           └── dashboard/ The internal dashboard at /app: alert list and review,
│                          district list, Leaflet map with cluster rings, weekly chart,
│                          and the alert socket
├── infra/
│   ├── docker-compose.yml PostgreSQL with PostGIS, Kafka and Redis; with
│   │                      --profile app, the whole stack
│   ├── docker/            One Dockerfile per image (api, web, detector, simulator),
│   │                      each with its .dockerignore, and the site's nginx config
│   └── .env.example       Settings, dummy values; copy to .env at the root
├── .github/workflows/     CI: tests, image builds and the full-stack smoke test
├── docs/
│   ├── adr/               Architecture decision records
│   ├── architecture/      The architecture: an illustrated overview, and a
│   │                      detailed diagram as SVG and PNG
│   └── design/
│       ├── PRODUCT.md     Product record
│       ├── DESIGN.md      Design system, written from the built page
│       └── source-images/ Full-resolution originals (archived, not shipped)
├── scripts/
│   ├── build-images.py    Regenerates frontend/src/assets from the originals
│   ├── district-boundaries/ Builds the public map's district outlines from geoBoundaries
│   ├── facility-registry/ Builds the registry seed from the Ministry of Health list
│   ├── measure-pipeline/  Measures the pipeline's throughput and latency
│   ├── smoke-test/        Checks a running full stack through its site
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
