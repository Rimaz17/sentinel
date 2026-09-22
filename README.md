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

A second, geographic check runs alongside it. DBSCAN clustering on report
coordinates looks for reports bunched within ~2 km arriving from several different
facilities. A tight cluster from many sources suggests a real local outbreak; a rise
spread evenly across a district suggests a wider seasonal wave.

## Build status

| Phase | Scope | State |
|---|---|---|
| 1 | Walking skeleton, facility registry, simulator, ingestion API, PostgreSQL | Not started |
| 2 | Detection v1, z-score baseline job writing alerts | Not started |
| 3 | Dashboard v1, React + Leaflet, polling | Not started |
| 4 | Accounts and roles, invite codes, PHI accounts, public dashboard | Not started |
| 5 | Real-time, Kafka, Redis windows, WebSocket alerts | Not started |
| 6 | Geography, PostGIS, DBSCAN, cluster rings | Not started |
| 7 | Ship it, Docker Compose, CI, deployed demo | Not started |
| n/a | **Landing page**, the public entry point at `/` | **Built** |

The landing page is the one surface that exists today. Every other route renders a
page stating which phase it belongs to and what will live there; see
[ADR 0002](docs/adr/0002-unbuilt-routes-render-placeholders.md).

No detector metrics appear in this README yet, because the detector has not been
built. When it is, the numbers here will come from an actual run.

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

There is **no backend to run yet**, the landing page is entirely static and makes
no network requests. Phase 1 is the first phase that produces something to open in
IntelliJ.

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

## Repository layout

```
sentinel/
├── frontend/
│   └── src/assets/        Shipped WebP figures, several widths each
├── docs/
│   ├── adr/               Architecture decision records
│   └── design/
│       ├── PRODUCT.md     Product record
│       ├── DESIGN.md      Design system, written from the built page
│       └── source-images/ Full-resolution originals (archived, not shipped)
├── scripts/
│   ├── build-images.py    Regenerates frontend/src/assets from the originals
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

`backend/` and `infra/` are not scaffolded yet; they arrive with the phase that
needs them.

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
- **Detection assumes a stable baseline.** A prior year containing a real epidemic
  inflates "normal" and reduces future sensitivity. Periodic recalibration would be
  needed.

## Credits

Rimaz Saththar · BSc (Hons) Computer Science, University of Westminster / IIT Sri
Lanka · 2026.

Facility registry derived from the "Ministry of Health Institutions" dataset
published by Team Watchdog (databank.watchdog.team), sourced from Sri Lanka's
Ministry of Health.
