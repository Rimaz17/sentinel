# Sentinel API

Every endpoint the API serves. Browsers reach it under `/api` on the site's own
origin.

Errors are [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) problem details
that name the field at fault and never repeat what was submitted in it.

**Public**, open to anyone and cacheable for a minute:

| Endpoint | What it does |
|---|---|
| `GET /api/public/districts` | Every district with its status, `USUAL` or `ELEVATED` with the symptom groups elevated, its reports over the last seven days, its usual week (the average of the eight before) and the one as a percentage of the other. |
| `GET /api/public/alerts` | Published alerts from the last 90 days, active first, in plain wording, with the day each was first and last flagged and whether an inspector confirmed it. |
| `GET /api/public/trends` | Reports per symptom group in each of the last nine weeks; `?district=KDY` for one district. |
| `GET /api/public/demo` | In demo mode only, otherwise 404: the demo accounts, their password, the demo invite code and the reset time. |

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
| `GET /api/alerts` | Alerts, most recently detected first; `?limit=` 1 to 200, `?district=KDY`. `open` is true while an alert is not closed and was detected within the last 24 hours; `published` says whether the public sees it. `clusters` lists where its reports are bunched, most reports first, each with its centre, `radiusMetres`, `reportCount`, `facilityCount`, `expectedCount` at its usual share and the nearest facility; `clustersCheckedAt` is when the geographic check last looked, null if it never has. |
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
([ADR 0016](adr/0016-alerts-pushed-over-websocket.md)):

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

In demo mode the demo administrator gets `403` from the account and invite code
changes above for anything a visitor did not make, and the two lists mark each
such row `lockedInDemo`.

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
