# 0001 — Frontend toolchain

Status: accepted · 2026-09-22

## Context

The frontend was scaffolded with `npm create vite@latest --template react-ts`. The
current Vite template ships two defaults that conflict with this project's own
standards:

1. It configures **oxlint** rather than ESLint. CLAUDE.md §9 requires ESLint and
   Prettier, and the accessibility rules this project depends on
   (`eslint-plugin-jsx-a11y`) have no oxlint equivalent that covers the same
   ground.
2. It does **not** enable TypeScript `strict`. CLAUDE.md §6 requires strict mode.

Separately, `vitest@3` — the version matching the installed Vite major at the time —
carries advisory GHSA-82fw-gwwq-j7x9 (path traversal via `@vitest/mocker`).

## Decision

- Replace oxlint with ESLint 9 flat config, `typescript-eslint` type-checked rules,
  `eslint-plugin-jsx-a11y`, `eslint-plugin-react-hooks` and Prettier via
  `eslint-config-prettier`.
- Enable `strict`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` and
  `noImplicitOverride`. Add an `@/*` path alias.
- Install **Vitest 5** rather than 3, which clears the advisory. `npm audit` reports
  zero vulnerabilities.
- `baseUrl` is omitted: TypeScript 6 deprecates it, and `paths` resolves relative to
  the config file without it.

## Consequences

- Linting is slower than oxlint would be, because type-checked rules require a
  TypeScript program. This is accepted: the a11y and `no-explicit-any` rules are
  load-bearing for a project whose quality bar names accessibility explicitly.
- `noUncheckedIndexedAccess` means array access returns `T | undefined`. The plate
  geometry code carries explicit guards as a result, which is the point.
- Vitest 5 is a major ahead of the scaffold's expectation. No incompatibility has
  surfaced; the suite runs green.

## Alternatives considered

- **Keep oxlint and add a separate a11y tool.** Two linters, two configs, two
  ignore syntaxes, for less coverage than one ESLint config.
- **Pin Vitest 3 and accept the advisory.** It is a dev-only dependency and the
  risk is low, but "dev-only" is exactly the argument that leaves a known
  vulnerability in a repository presented as finished work.
