# 0011, Accounts, tokens and district scope

Status: accepted · 2026-09-28

## Context

Phase 4 adds the roles the project overview defines: the public with no account,
data providers who register with a facility invite code, public health
inspectors (PHI) created by an administrator, and an administrator provisioned at
setup. CLAUDE.md fixes several things: Spring Security with JWT, refresh tokens
so an inspector is not dropped mid-shift, one `PHI` role whose reach is a list of
districts rather than a role per scope, scope enforced in every query, the
facility taken from the token, BCrypt, and rate limits on sign-in and ingestion.
What it leaves open is how those pieces fit together.

## Decision

- **One `accounts` table for all staff.** Role is `DATA_PROVIDER`, `PHI` or
  `ADMIN`. A data provider has a facility and nothing else does; a PHI account
  lists its districts, with `*` for every district. The database refuses a PHI
  account with an empty list, so the rule that an empty list means national can
  never be reached by accident: national reach is always written as `*`.
- **The API issues its own tokens.** An access token is an HS256 JWT signed with
  `SENTINEL_JWT_SECRET`, valid for 15 minutes, carrying the account id, role, an
  inspector's districts and a data provider's facility code. Nothing else goes in
  it. Requests are authorised from the token without a database lookup.
- **Refresh tokens are opaque, rotated and kept as hashes.** Each is 256 random
  bits in an `HttpOnly`, `SameSite=Strict` cookie scoped to `/api/auth`, so scripts
  cannot read it and it is never sent to any other endpoint. It lasts 12 hours
  and every use replaces it, so an inspector who keeps working stays signed in
  through a long shift. A replaced token presented again more than a minute later
  means a copy is loose, and every session the account holds is ended; within
  the minute it is refused quietly, because two tabs can refresh at once.
- **The access token lives in the browser's memory.** A reload recovers the
  session from the cookie. Nothing is kept in `localStorage`.
- **Scope is enforced in every query, from the token.** Each internal endpoint
  asks the caller which districts a query may cover. A district outside scope is
  403, and naming no district means every district in scope, never the country.
  A caller who is not an inspector reaches no district at all: an absent
  `districts` claim is never read as national.
- **Anything without a rule is refused.** The security configuration names each
  path it opens; every other request is denied.
- **The administrator comes from the environment.** On startup, if the address
  in `SENTINEL_ADMIN_EMAIL` holds no account, one is created. An existing account
  is never changed.
- **Inspectors activate by a one-time link.** An administrator creates the
  account without a password and receives a link's secret to pass on; Sentinel
  sends no email. The link lasts 7 days, works once, and is stored as a hash. The
  same mechanism, issued again, is how anyone resets a password.
- **Rate limits are per address for guessing, per account for submissions.**
  Sign-in, registration, invite-code checks and activation: 10 a minute per
  client address. Report submissions: 120 a minute per data provider account.
  Counted in memory in one-minute windows.
- **Secrets are redacted from `toString`.** The web layer logs handler arguments
  and response bodies at trace level, so every request or response record that
  carries a password, token, invite code or link overrides `toString`, and a
  test proves none reaches the logs with verbose logging on.

## Consequences

- A token cannot be revoked. Disabling an account or narrowing an inspector's
  districts takes effect when the session is next renewed, at most 15 minutes
  later; sign-in and renewal both check the account.
- A new instance of the API must share `SENTINEL_JWT_SECRET`, and rate-limit
  counts are per instance. Both are fine for one instance; a second would need a
  shared rate-limit store.
- Behind a reverse proxy every client has the proxy's address, so the per-address
  limit becomes a global one. `X-Forwarded-For` is deliberately not trusted until
  a proxy that sets it is part of the deployment (Phase 7).
- Invite codes are shared per facility, as the overview accepts, and hashed with
  SHA-256 rather than BCrypt, because registration must find the facility by its
  code. A code is about 35 bits; online guessing is held back by the rate limit,
  but a copy of the table would let codes be recovered offline.

## Alternatives considered

- **Server sessions.** Simpler to revoke, but CLAUDE.md asks for stateless tokens
  so the API, the alert service and the dashboard agree on identity without a
  shared session store.
- **Access token in `localStorage`.** Survives a reload without a refresh call,
  but any script on the page can read it.
- **A role per scope** (`PHI_DISTRICT`, `PHI_NATIONAL`). Ruled out by CLAUDE.md,
  and every new kind of reach would need code rather than data.
- **An external identity provider.** A real deployment might use one; here it
  would add a service to run for no gain in what the demonstration shows.
