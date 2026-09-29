# 0012, The simulator submits through a trusted report feed

Status: accepted · 2026-09-28

## Context

Phase 4 replaces the `X-Facility-Code` header of ADR 0004 with sign-in. A data
provider signs in, and their access token names the one facility their account
was registered to with that facility's invite code. Ingestion reads the facility
from the token and nowhere else.

The simulator does not fit that shape. It stands in for the reporting of every
facility at once: a 63-day backfill posts about 10,000 reports from over 800
facilities, and live mode keeps posting as all of them. To submit through data
provider accounts it would need one account per facility, each registered with
its own invite code: hundreds of accounts, each password hashed with BCrypt,
made before the first report and kept somewhere.

Real systems meet the same problem. A hospital information system gateway, or a
district's reporting office forwarding returns, submits for many facilities
under one identity, and that identity is trusted by arrangement rather than by a
per-facility login.

## Decision

The API accepts a **report feed**: a caller holding the key in
`SENTINEL_FEED_KEY` sends it in an `X-Feed-Key` header, and names the facility of
each report in `X-Facility-Code`. The simulator is the feed.

- **Off unless configured.** With no key set, the feed does not exist: any
  `X-Feed-Key` is refused with 401. A configured key must be at least 32 bytes.
- **A wrong key is refused, not ignored.** A request carrying a key that does not
  match gets 401 at once rather than falling through as anonymous, so a
  misconfigured simulator fails loudly. Keys are compared in constant time.
- **The feed is not a person and not a role.** It authenticates as its own
  authority, `FEED`, outside the role enum, and holds no account. It may submit
  reports and read the facility registry, which the simulator needs to know
  which facilities exist, and nothing else: no reports, alerts, districts or
  administration.
- **Data providers are unchanged by it.** For a signed-in data provider the
  facility comes from their token. An `X-Facility-Code` header or a facility
  field in the body is ignored, and a test proves a Kandy provider naming Colombo
  in both still stores the report under Kandy.
- **The feed is not rate limited.** It is one trusted caller doing bulk work;
  the ingestion limit applies per data provider account.

## Consequences

- Whoever holds the feed key can submit as any facility. That is the integrity
  hole the invite codes close for people, reopened for one configured system. It
  is acceptable here because the feed exists to carry simulated data, the key is
  never committed, and switching it off is a matter of unsetting one variable. A
  production deployment would give each integration its own key, scoped to the
  facilities it serves.
- The simulator needs `SENTINEL_FEED_KEY` in its environment or in the
  repository's `.env`, the same file the API reads.
- ADR 0004's header survives only for the feed. Its promise, that the request
  body and the ingestion service would not change when sign-in arrived, held:
  only the controller changed.

## Alternatives considered

- **One data provider account per facility.** The most faithful to how a person
  submits, and it would exercise registration end to end, but it makes the demo
  setup slow and stateful: an admin sign-in, hundreds of invite codes and
  registrations, and a file of passwords to keep, before one report can be sent.
- **Sign the simulator's tokens with the API's own key.** The simulator could
  mint a data provider token for each facility. That hands it the key that signs
  every inspector's and administrator's token too, which is far more trust than
  submitting reports needs.
- **Leave ingestion open to the header, as in Phase 1.** It would leave the hole
  ADR 0004 promised Phase 4 would close.
