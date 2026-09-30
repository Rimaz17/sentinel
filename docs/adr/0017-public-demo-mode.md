# 0017, A public demo mode: published accounts, a held-back administrator and a nightly reset

Status: accepted · 2026-10-01

## Context

Sentinel is a portfolio project. Most of what it does sits behind sign-in, and
by design (ADR 0011) nobody can make a staff account for themselves: inspector
and administrator accounts are created by an administrator, and a data provider
needs their facility's invite code. A recruiter or reviewer visiting the deployed
demo would therefore see the landing page and the public dashboard and nothing
else: not the internal dashboard, not district scope, not administration.

The obvious fix, publishing some credentials, has a real cost. Whatever is
published will be used by strangers, and some of them will press every button.
The question is not whether to publish, but what a published account may do.

## Decision

- **Demo mode is a setting, off unless switched on** (`SENTINEL_DEMO_MODE`). Off,
  nothing below exists: no demo accounts, no demo endpoint, no restriction. The
  access rules of ADR 0011 are unchanged either way; demo mode only
  pre-provisions accounts, as an administrator would.
- **Four demo accounts, all in Colombo where they are tied to a place:** an
  administrator, an inspector for every district, an inspector for Colombo only,
  and a data provider at the Infectious Diseases Hospital, Angoda. They share one
  password, `SENTINEL_DEMO_PASSWORD`, and live under `demo.sentinel.test`, a name
  that can never receive mail. They are created when the API starts and put back
  exactly as they were every night.
- **They are shown on the sign-in page with their passwords**, from
  `GET /api/public/demo`, which exists only in demo mode. "Use this account"
  fills the form rather than signing in, so a visitor still goes through the
  real sign-in. The Colombo inspector's card suggests opening Kandy, so the
  district scope can be seen refusing.
- **The demo facility's invite code is published on the registration page**
  (`SENTINEL_DEMO_INVITE_CODE`). A facility's code is shared by all its staff
  (the facility_invite_codes migration), so one code serves every visitor and
  registering with it is the same two steps a real facility's staff take.
- **The demo administrator may change only what visitors made.** It sees every
  page and uses every form. It may create inspectors, and change or re-link the
  accounts visitors made; it may issue invite codes, and replace or revoke the
  ones it issued itself. It may not disable, enable or re-link the demo
  accounts or any account the owner made, and may not replace or revoke the
  published code or a code another administrator issued. The API refuses these
  with 403 and a reason (`DemoGuard`), and the page shows the buttons disabled
  with "Switched off in the demo" under them, so a visitor sees what
  administration can do as well as what the demo holds back. The owner's own
  administrator, from `SENTINEL_ADMIN_EMAIL`, is never held back.
- **Visitors' accounts are marked** (`accounts.made_in_demo`, Flyway V13): an
  inspector the demo administrator creates, and a data provider registered with
  a code the demo administrator issued. Marking by who made the account, rather
  than deleting everything that is not a demo account, means the reset can never
  take an account the owner made, even if demo mode is switched on against a
  database the owner uses.
- **Every night at 03:00 Sri Lanka time the demo is reset** (`DemoState.reset`):
  every alert returns to new with no verdict; the accounts visitors made are
  deleted, with their sessions and links; the invite codes the demo
  administrator issued are removed; and the demo accounts and the published code
  are put back. The time is `sentinel.demo.reset-at`.
- **Visitors are asked for made-up details.** Anyone signed in as the demo
  administrator can see every account's name and email until the reset, so the
  registration page and the new inspector form both say to use a made-up name
  and email address.

## Consequences

- A reviewer can reach every part of the system in one click from the sign-in
  page, and the demo cannot be left broken for the next one by anything the
  published accounts can do.
- **Reports are not reset.** A report carries no account, by design
  (anonymisation at the front door), so a visitor's report cannot be told from
  the simulator's. Both are simulated, the ingestion rate limit caps a visitor at
  120 a minute, and the detector may raise an alert on a flood of them; the
  nightly reset returns that alert to new but does not remove it.
- **Every alert returns to new each night**, including any the owner reviewed.
  Status changes are not recorded against an account, so a visitor's cannot be
  told from the owner's. Demo mode belongs on a deployment meant for visitors;
  `infra/.env.example` says so beside the setting.
- The owner's accounts are visible, name and email, to anyone signed in as the
  demo administrator. A deployment for visitors should hold only the owner's
  administrator and the demo accounts.
- The demo password and code are public. The API refuses to start in demo mode
  with a password shorter than the policy's 12 characters or a code not shaped
  like one, and neither should be reused anywhere.
