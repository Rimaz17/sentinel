# Design

<!-- Written from the built landing page, not ahead of it. Every value here is
     one that ships in `sentinel/frontend/src/styles/`. -->

Sentinel's surfaces are **ink on paper, ruled**. Structure is carried by hairlines
and weight, never by cards, shadows or rounded containers. A single ochre marks the
one measurement a view exists to show, and marks nothing else.

## The world in one paragraph

A survey plate. The page reads as a sheet from a ledger: a set headline, a column
of measured annotations in letter-spaced monospace, a large tonal drawing, and a
caption bar under it. What separates it from an editorial pastiche is that the
annotations are real — every mono string on the page is a coordinate, a count, an
ISO date, a sigma value or a district code. If a mono string is not a measured
value, it is in the wrong face.

## Colour

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f2f5f5` | Page ground |
| `--paper-raised` | `#f7f9f9` | The plate switcher's ground |
| `--paper-sunk` | `#e7ebec` | The privacy band |
| `--ink` | `#15222b` | Body text, rules at full strength, the disclosure band's ground |
| `--ochre` | `#8f6203` | The one accent. Text-safe at 4.89:1 on paper |
| `--ochre-bright` | `#c88a05` | Graphic fill on `--ink` only — 2.70:1 on paper, so never type there |
| `--alert` | `#e0443e` | Reserved for the alert vocabulary; unused on the landing page |

Ink alphas and their measured ratios on `--paper`:

| Token | Ratio | Permitted use |
|---|---|---|
| `--ink` | 14.78:1 | Any text |
| `--ink-85` | 9.46:1 | Any text |
| `--ink-70` | 5.76:1 | Any text — the secondary body colour |
| `--ink-55` | 3.62:1 | Large text only (≥24px, or ≥18.7px bold). Nothing on the landing page qualifies, so it is currently non-text only |
| `--ink-40` / `--ink-24` | 2.40:1 / 1.64:1 | Non-text: rules, inactive marks |
| `--ink-14` / `--ink-08` / `--ink-04` | — | Hairline rules and washes |

**Colour strategy: restrained.** Neutrals plus one accent. The visitor came to
understand something and then leave for the dashboard, and a system about outbreaks
has no business being loud. Severity and state are never carried by colour alone —
the exceeding district on the plate is also the tallest thing in the frame and the
only trace with a heavy crest, and the active plate tab inverts its ground rather
than merely tinting.

Symptom-group hues are fixed and never reassigned: dengue `#8b3a8f`, ILI `#2f67b1`,
GI `#6e7f1f`, leptospirosis `#12806e`.

## Type

Two self-hosted variable faces. No third-party font request, so no layout shift
waiting on one.

- **Schibsted Grotesk Variable** — display and body. A neo-grotesque with a wide,
  open lower case that holds together set tight at display sizes.
- **Geist Mono Variable** — measurement only. Tabular figures are on wherever two
  numbers might be compared.

| Token | Value |
|---|---|
| `--step-display` | `clamp(2.375rem, 1.6rem + 3.4vw, 4.5rem)` |
| `--step-title` | `clamp(1.75rem, 1.3rem + 2vw, 2.75rem)` |
| `--step-section` | `clamp(1.25rem, 1.1rem + 0.7vw, 1.625rem)` |
| `--step-body-lg` | `clamp(1.0625rem, 1rem + 0.3vw, 1.1875rem)` |
| `--step-body` | `1rem` |
| `--step-small` | `0.875rem` |
| `--step-label` | `0.75rem` |
| `--step-label-sm` | `0.6875rem` |

Tracking: `-0.03em` display, `-0.02em` title, `-0.01em` body, `0.13em` on mono
labels and `0.18em` on the small ones. Measure is `68ch` for body, `22ch` for the
display headline.

**A measure set in `ch` belongs on the element that carries the type**, not on its
container. `ch` resolves against the element's own font size, so `max-width: 24ch`
on a 16px wrapper clamps a whole column to ~235px on a phone. That bug shipped once
here and is the reason the rule is written down.

**Never apply `text-transform: uppercase` to a value.** Values carry units and
proper nouns, and uppercasing silently turns `3.2σ` into `3.2Σ` — a different
symbol. Terms may be uppercased; values may not. Mono plus tabular figures already
supplies the technical register.

## Space and motion

A 4px-rooted scale, fluid at the larger steps: `--space-3xs` `0.25rem` through
`--space-3xl` `clamp(5rem, 3.4rem + 7vw, 9rem)`. The page gutter is
`clamp(1rem, 0.55rem + 2vw, 2.5rem)` and never drops below 16px. Shell max width
`84rem`.

Easing is `cubic-bezier(0.16, 1, 0.3, 1)` — exponential ease-out, always from an
already-visible default. Nothing on the page animates in from nothing.

**One authored moment: the plate change** (`--dur-plate`, 620ms). The outgoing
plate leaves while the incoming one settles up and back to rest, so the change
reads as a page turn rather than a dissolve. Everything else is 120–200ms and gets
out of the way. `prefers-reduced-motion: reduce` collapses all four duration tokens
to `1ms` at the token level, so a component that forgets its own media query still
respects the preference.

## Components

- **Two action shapes, and no third.** A ruled box (`.action--primary`) for the
  thing most visitors came to do, whose ink fill rises from the foot of the box on
  hover rather than fading in; and a quiet underlined link (`.action--quiet`) for
  everything else. A filled button would be a third voice.
- **The mono label** (`.label`) is the only place mono appears, and it always
  carries a measured value.
- **Rules, not cards.** `--rule-hair` / `--rule-faint` / `--rule-firm` /
  `--rule-ink`. There are no elevation tokens because nothing is elevated.
- **The plate** is a tab set: the switcher is the tab list, each plate a panel,
  with roving tabindex and Arrow/Home/End keys. Every plate carries a text
  alternative that states the same information the drawing does.

## Browser surfaces

Themed from the palette rather than left to the platform: selection (`--ink` ground,
`--paper` text), caret (`--ochre`), `accent-color`, thin scrollbars in `--ink-24`,
one 2px `--ink` focus ring at 2px offset for the whole page, and a `0.28em`
underline offset on links.

## Accessibility floor

Verified on the built page, not asserted: every visible text node clears its WCAG
threshold (4.5:1 body, 3:1 large), all 16 focusable elements show a visible focus
ring, the page has no horizontal overflow at 375px, and the privacy table restacks
on a phone with its column headers preserved as group labels.
