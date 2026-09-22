# Design

<!-- Written from the built landing page, not ahead of it. Every value here is
     one that ships in `sentinel/frontend/src/styles/`. -->

Sentinel's surfaces are **ink on paper, ruled**. Structure is carried by hairlines
and weight, never by cards, shadows or rounded containers. A single ochre carries
the page's attention, and is spent in exactly two places.

## The world in one paragraph

A survey sheet. A set headline, a column of measured annotations in letter-spaced
monospace, and content separated by rules rather than boxed into panels. What keeps
it from being editorial pastiche is that the annotations are real — every mono
string on the page is a count, a window, a threshold or a district figure. If a
mono string is not a measured value, it is in the wrong face.

Every section that splits in two uses **one shared grid** — the same 50/50 ratio
and the same gap — so the column edges line up from the header to the footer.
Sections inventing their own ratios is what made an earlier build read as
unaligned. What must never come back is the segmented **plate switcher** that sat
over a figure in an earlier build; it came from a mis-cropped reference image and
does not exist on the page the reference was taken from.

## Colour

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f2f5f5` | Page ground |
| `--paper-raised` | `#f7f9f9` | Raised ground |
| `--paper-sunk` | `#e7ebec` | The privacy band |
| `--ink` | `#15222b` | Body text, rules at full strength |
| `--ochre` | `#8f6203` | The accent. Text-safe at 4.89:1 on paper |
| `--ochre-bright` | `#c88a05` | Reserved for marks on dark surfaces — 2.70:1 on paper, so never type there |
| `--alert` | `#e0443e` | Reserved for the alert vocabulary; unused so far |

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
has no business being loud.

**Where the ochre is spent.** Twice per view, and never on furniture:

1. the one measurement the whole system turns on — the `3σ` threshold in the hero
   rail;
2. the one thing every visitor must know — the simulated-data notice, which takes
   an ochre wash and a 1px ochre rule.

Nothing else gets it. Hover states, borders, headings and links are all ink. The
moment ochre decorates something it stops meaning "read this".

State is never carried by colour alone: the simulated notice is also set apart by
its ground and its rule, and severity vocabulary on later surfaces must follow the
same rule.

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

### The display step is not in the scale

It is the one size that does not belong to the viewport, so it is set on
`.hero__title` rather than as a token:

- **Single column** (`< 60rem`): `clamp(2.5rem, 5.8vw, 4rem)`. Here the column *is*
  the viewport, so `vw` is the honest unit.
- **Two columns** (`≥ 60rem`): `clamp(2.5rem, 10.4cqw, 5rem)`, against a
  `container-type: inline-size` on `.hero__lede`.

Above `60rem` the headline sits in a grid column roughly half the viewport's width.
A viewport-fluid size makes the ratio of column width to type size drift as the
window narrows, which moves where the real headline breaks — at 1100px it produced
a fourth line carrying only the words "no single". Container units hold that ratio
constant, so the headline stays at three even lines from 960px up. The two slopes
are chosen to meet at the breakpoint, so the type does not jump as the layout
reflows (980px → 55.9px, 940px → 54.5px).

**Two rules learned the hard way, both from shipped bugs:**

- **A measure set in `ch` belongs on the element that carries the type**, not on its
  container. `ch` resolves against the element's own font size, so `max-width: 24ch`
  on a 16px wrapper clamps a whole column to ~235px on a phone.
- **Never apply `text-transform: uppercase` to a value.** Values carry units and
  proper nouns, and uppercasing silently turns `3.2σ` into `3.2Σ` — a different
  symbol. Terms may be uppercased; values may not. Mono plus tabular figures already
  supplies the technical register.

## Layout

```
.split                two equal columns, gap --space-2xl, from 68rem up
.split--paired        centres a text block against a figure
.split--flip          moves the first child to column two
```

**Why 68rem and not 60rem.** Below about 1088px the columns are too narrow to
carry a figure: the text column keeps growing as it narrows while the figure only
shrinks, so the two drift apart and leave exactly the dead space the split exists
to avoid. At 1000px wide the detection section reached a 500px imbalance. Stacked
is balanced by definition, so below the breakpoint the page stacks.

**Why `--paired` centres.** With a figure beside a text block, the shorter of the
two otherwise leaves a tall void at one end. Centring halves it and puts what is
left on both sides, where it reads as margin rather than as a gap.

**Why `--flip` exists.** The figure side alternates down the page — right, left,
right, left — while the DOM keeps heading-then-figure order, so a screen reader
and the stacked phone layout both get the heading first.

**Measured balance** at 1400px, as the difference between the two column heights:
hero 83px, detection 94px, privacy 84px, entries 68px. Anything approaching 300px
means something belongs outside the split — which is why the detection section's
closing caveat is a full-width line under both columns rather than the last
paragraph of the text column.

## Imagery

Three figures, one per section, each filling its own column so all three share a
width and a pair of edges. All three are drawings; none is a rendering of real or
simulated system output, and every caption says `illustration`.

| Figure | Where | Why there |
|---|---|---|
| `dengue-vector` | Hero, right | Dengue is the symptom group the specification's worked example follows |
| `two-views` | Detection, left | Its own annotations — "isolated cases", "rainy season?" — are the argument that section makes |
| `network-map` | Entry paths, left | The country, at the moment the page asks the visitor to pick their district |

**Cut-outs, keyed.** Two of the three originals were exported as JPEG with their
transparency baked in as a checkerboard. `scripts/build-images.py` keys that back
out: the artwork is dark on a light checker, so anything at or above the darker
square is background and how far below it a pixel sits gives its opacity. The last
few percent of opacity is discarded — that is JPEG ringing around the checker
edges, and without the cut a faint checker ghost survives into the page.

**Trimmed to the artwork.** Each cut-out is then cropped to its own alpha bounding
box. The exports carry a wide empty margin, and left in, that margin ships as
whitespace inside the page's columns.

**`contain`, not `cover`, by default.** Cropping a trimmed cut-out just clips the
drawing. Opaque artwork opts into `cover` through the figure's `fit` prop; the
detection collage uses `fit="cover"` with a `6 / 7` ratio so a square image fills a
taller frame, and that crop was checked against all five of its labels.

**Delivery.** WebP at 640/768/960 and up, with `srcset` and a real `sizes`. A phone
at 2× asks for 686px and takes the 768 variant, so the three figures cost 164 KB
rather than the 230 KB the 960s would have.

**No layout shift.** Every figure carries intrinsic `width`/`height` and its frame
has an `aspect-ratio`, so its space is reserved before any bytes arrive. Measured
CLS on load is 0.

**Two ratio variables, deliberately.** The component sets `--figure-ratio` inline.
An inline custom property cannot be overridden by a stylesheet rule on the same
element, so a breakpoint that needs a different crop sets `--figure-ratio-override`
instead. Setting `--figure-ratio` in a media query silently loses; that bug shipped
once here.

## Space and motion

A 4px-rooted scale, fluid at the larger steps: `--space-3xs` `0.25rem` through
`--space-3xl` `clamp(5rem, 3.4rem + 7vw, 9rem)`. The page gutter is
`clamp(1rem, 0.55rem + 2vw, 2.5rem)` and never drops below 16px. Shell max width
`84rem`.

Easing is `cubic-bezier(0.16, 1, 0.3, 1)` — exponential ease-out, always from an
already-visible default. Nothing on the page animates in from nothing.

**One authored moment: the primary action takes its ink from the foot of the box
upward** on hover, rather than fading in — the control reads as being inked, not
lit. Everything else is 120–200ms and gets out of the way.
`prefers-reduced-motion: reduce` collapses the duration tokens to `1ms` at the token
level, so a component that forgets its own media query still respects the
preference.

## Components

- **Two action shapes, and no third.** A ruled box (`.action--primary`) for the
  thing most visitors came to do; a quiet underlined link (`.action--quiet`) for
  everything else. A filled button would be a third voice.
- **The mono label** (`.label`) is the only place mono appears, and it always
  carries a measured value.
- **Rules, not cards.** `--rule-hair` / `--rule-faint` / `--rule-firm` /
  `--rule-ink`. There are no elevation tokens because nothing is elevated.
- **Tables are tables.** The privacy model is a real `<table>` because it is
  genuinely tabular, and it restacks on a phone with its column headers preserved
  as group labels via `data-head`.

## Browser surfaces

Themed from the palette rather than left to the platform: selection (`--ink` ground,
`--paper` text), caret (`--ochre`), `accent-color`, thin scrollbars in `--ink-24`,
one 2px `--ink` focus ring at 2px offset for the whole page, and a `0.28em`
underline offset on links.

## Accessibility floor

Verified on the built page, not asserted: every visible text node clears its WCAG
threshold (4.5:1 body, 3:1 large), every focusable element shows a visible focus
ring, there is no horizontal overflow from 375px up, one `<h1>` with no skipped
heading levels, and the privacy table restacks on a phone with its headers intact.
