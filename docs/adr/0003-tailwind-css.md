# 0003, Tailwind CSS for styling

Status: accepted · 2026-09-23

## Context

The landing page was styled with plain CSS: a token file, a reset, a shared
layout file and one BEM-named stylesheet per component, about 1,260 lines across
16 files. The project owner chose to move the whole frontend to Tailwind CSS
before the dashboards are built, so the internal and public dashboards start on
the same footing as the landing page rather than a second styling approach
appearing later.

The constraint was that nothing visible may change. The landing page is finished
and reviewed; the migration is a change of implementation, not of design.

## Decision

- **Tailwind CSS v4** (`tailwindcss` and `@tailwindcss/vite`, pinned at 4.3.3),
  configured in CSS in `src/index.css`. There is no `tailwind.config.js`.
- **The default theme is cleared** (`--*: initial`) and replaced with the
  project's own tokens: colours, type steps, tracking, leading, spacing, measures
  and breakpoints. A class can only name a value the design system defines.
- **Preflight is not loaded.** The project's own reset moves into the `base`
  layer instead. Preflight differs from it in ways that would change the page:
  it strips link underlines, resets heading sizes and weights, and sets a
  different default line height.
- **Layer order is declared first**, `theme, base, utilities`, so every utility
  beats the reset regardless of where the reset is written.
- **`hover:` is restored to a plain `:hover`.** v4 gates it behind
  `@media (hover: hover)`, which would stop hover styles applying on touch
  screens; the page has always applied them.
- **Repeated utility sets are named in `src/styles/recipes.ts`** rather than with
  `@apply` or custom CSS classes, so a component's styling stays readable in its
  own markup. Recipes never set colour, so no element ends up with two competing
  colour utilities; there is no `tailwind-merge` to resolve such conflicts.

## Verification

Both builds were rendered in headless Edge and compared:

- **Pixels.** Full-page screenshots of the landing page and a placeholder route
  at 375, 768, 1280 and 1440px: 20.2 million pixels, 0 differing.
- **Computed style.** Every element's computed style and box at seven widths
  (375 to 1440, including the 480px edge of the `phone:` variant), with hover
  and focus forced on every link, and once under reduced motion: 905,280 values
  compared. Every difference was a serialisation of the same rendering, for
  example `transform: translateY(1px)` against `translate: 0 1px`, or a border
  colour on a side whose width is zero.

The comparison found two real regressions during the migration, both fixed
before commit: the layer order (the reset was outranking utilities, which
collapsed every auto margin and overrode link colours), and an underline
thickness on the staff links that the old stylesheet had reset to the font's
own.

## Consequences

- Styling lives in the markup. A component can be read without opening a
  second file, and there is no cascade between components to reason about.
- Values outside the scale need an arbitrary value (`max-w-[26ch]`), which makes
  them visible in review rather than hiding them in a stylesheet.
- Two utilities setting the same property on one element resolve by Tailwind's
  output order, not class order. Recipes are written to avoid this; if it
  becomes common, `tailwind-merge` is the remedy and would be a new dependency.
- The design tokens are now named `--color-*`, `--text-*`, `--spacing-*` and so
  on, as Tailwind's theme namespaces require. `DESIGN.md` records the mapping.
