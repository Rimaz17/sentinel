# 0002, Unbuilt routes render honest placeholders

Status: accepted · 2026-09-22

## Context

The landing page is built before the dashboards, the sign-in flow and the
submission portal (CLAUDE.md §10 puts those in phases 3 and 4). It must still link
to `/dashboard`, `/signin`, `/register` and `/app`, because those links are the
page's entire reason to exist, it is the single public entry point and it carries
three distinct paths.

That leaves a question with three real answers: what happens when someone follows
one of those links today?

## Decision

Each unbuilt route renders a `PlannedPage`: the real site header and footer, the
build phase it belongs to, a plain statement that it is not built yet, and two or
three sentences naming what will actually live there. A catch-all route does the
same for unknown addresses.

The sign-in placeholder additionally states that inspector accounts are created by
a system administrator and that an inspector without an account should contact
their district administrator. No contact address is invented.

## Consequences

- No link on the landing page is a dead end, and nothing on the site pretends to be
  finished when it is not.
- The placeholder copy is real product information, so it becomes the starting
  content for each surface when its phase arrives rather than being thrown away.
- There is a small ongoing cost: each phase must remember to replace its
  placeholder rather than route around it. The route map in `AppRoutes.tsx` is the
  single place that lists them, which keeps that visible.

## Alternatives considered

- **Inert or disabled links.** Smallest change, but a landing page whose primary
  action does nothing is worse than one that explains itself, and a disabled
  primary call to action reads as broken rather than as unfinished.
- **Build a mock public dashboard against stub data.** This would put a fake
  dashboard in front of visitors two phases early, and a screenshot of it would be
  indistinguishable from the real thing later. The project's own principle is to
  document what is simulated rather than to blur it.
