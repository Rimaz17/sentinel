# 0004, Facility identity comes from a header until sign-in exists

Status: accepted · 2026-09-27

## Context

Phase 1 builds report ingestion. Phase 4 builds accounts: data providers sign in
and receive a token whose claims name their facility. Between the two, the API
still has to know which facility a report comes from, because the report's
district, and later its place in detection, follow from the facility.

CLAUDE.md is explicit that facility identity comes from the submitter's token and
never from the request body. Accepting it from the body would let one clinic
submit as another. Before Phase 4 there is no token, so some stand-in is needed,
and the choice decides how much has to change when sign-in arrives.

## Decision

The submitter names its facility in an `X-Facility-Code` request header, carrying
the facility's Ministry of Health institution number. The API resolves it against
the registry and refuses an unknown code with 403. The report body has no
facility or district field at all, and any such field sent is ignored, so the
body already has the shape it will keep.

In Phase 4 the header is replaced by the facility claim in the data provider's
token. The request body, the stored report and the ingestion service do not
change; only where the controller reads the facility code from.

## Consequences

- **Phase 1 has no authentication, and this header is not one.** Anyone who can
  reach the API can submit as any registered facility, and can read every
  endpoint, including `GET /api/reports`, which returns approximate report
  locations. That endpoint is internal data: Phase 4 restricts it to inspectors,
  scoped to their districts, and it is never part of the public API. Until then
  the API must not be exposed beyond a developer's machine; the compose file binds
  its database to loopback for the same reason.
- **Rate limiting waits for Phase 4.** A limit keyed on a header anyone can set
  limits nothing, and a limit keyed on address would throttle the simulator's
  backfill, which legitimately posts thousands of reports from one machine. Rate
  limits on ingestion and sign-in arrive with authenticated identity.
- A test proves that a body claiming another facility and district is stored
  under the header's facility, so the rule that matters survives the change.

## Alternatives considered

- **Facility in the body for now.** Simplest, but it is the pattern the rules
  forbid, and it would change the request shape in Phase 4 for every client.
- **Facility in the URL** (`/api/facilities/{code}/reports`). The same trust level
  as a header, but the URL would have to change once identity moves to the token.
- **Build sign-in first.** It would reorder the project overview's build plan,
  which deliberately gets a thin slice working end to end before accounts.
