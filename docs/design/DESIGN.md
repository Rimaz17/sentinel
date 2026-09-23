# Design

<!-- Written from the built landing page, not ahead of it. Every value here is
     one that ships in the Tailwind theme in `sentinel/frontend/src/index.css`. -->

Sentinel's surfaces are **ink on paper, ruled**. Structure is carried by hairlines
and weight, never by cards, shadows or rounded containers. A single ochre carries
the page's attention, and is spent in exactly two places.

## Implementation

The system is written in **Tailwind CSS v4**, with Tailwind's default theme
cleared. The only colours, sizes and steps a class can name are the ones below,
declared in the `@theme` block of `src/index.css`: `--color-ink-70` is used as
`text-ink-70` or `border-ink-70`, `--spacing-xl` as `gap-xl` or `py-xl`,
`--text-title` as `text-title`. There is no `text-gray-500` to reach for by
accident.

Tailwind's preflight is **not** loaded. The project keeps its own reset in the
same file's `base` layer, because preflight differs from it in ways that change
the page (it strips link underlines and resets heading sizes). Layers are
declared `theme, base, utilities` before anything else, so every utility beats
the reset. Utility sets the page repeats are named once in
`src/styles/recipes.ts` (`shell`, `split()`, `sectionTitle`, `labelSm`, `caps`,
`tnum`, `monoLink`).

The migration from plain CSS was verified as rendering-identical: full-page
screenshots of every route at 375, 768, 1280 and 1440px match the plain-CSS
build pixel for pixel, and a computed-style comparison of every element, at seven
widths and under forced hover and focus, found no difference that draws.

## The world in one paragraph

A survey sheet. A set headline, a column of measured annotations in letter-spaced
monospace, and content separated by rules rather than boxed into panels. What keeps
it from being editorial pastiche is that the annotations are real, every mono
string on the page is a count, a window, a threshold or a district figure. If a
mono string is not a measured value, it is in the wrong face.

Every section that splits in two uses **one shared grid**, the same 50/50 ratio
and the same gap, so the column edges line up from the header to the footer.
Sections inventing their own ratios is what made an earlier build read as
unaligned. What must never come back is the segmented **plate switcher** that sat
over a figure in an earlier build; it came from a mis-cropped reference image and
does not exist on the page the reference was taken from.

## Colour

| Token | Value | Use |
|---|---|---|
| `--color-paper` | `#eaeeee` | Page ground |
| `--color-paper-raised` | `#f1f4f4` | Raised ground |
| `--color-paper-sunk` | `#dfe4e4` | Reserved; unused on the landing page |
| `--color-ink` | `#15222b` | Body text, rules at full strength, the footer ground |
| `--color-ochre` | `#8f6203` | The accent. Text-safe at 4.59:1 on paper |
| `--color-ochre-bright` | `#c88a05` | Reserved for marks on dark surfaces, 2.70:1 on paper, so never type there |
| `--color-alert` | `#e0443e` | Reserved for the alert vocabulary; unused so far |

Ink alphas and their measured ratios on paper:

| Token | Ratio | Permitted use |
|---|---|---|
| `--color-ink` | 13.86:1 | Any text |
| `--color-ink-85` | 9.02:1 | Any text |
| `--color-ink-70` | 5.58:1 | Any text, the secondary body colour |
| `--color-ink-55` | 3.55:1 | Large text only (≥24px, or ≥18.7px bold). Nothing on the landing page qualifies, so it is currently non-text only |
| `--color-ink-40` / `-24` | 2.40:1 / 1.64:1 | Non-text: rules, inactive marks |
| `--color-ink-14` / `-08` / `-04` | n/a | Hairline rules and washes |

Paper alphas, for the ink footer and the translucent header: `--color-paper-86`
(header ground), `--color-paper-72` and `--color-paper-62` (footer text; 62% is
the floor for its 11px line, at 6.4:1 on ink).

**Colour strategy: restrained.** Neutrals plus one accent. The visitor came to
understand something and then leave for the dashboard, and a system about outbreaks
has no business being loud.

**Where the ochre is spent.** Twice per view, and never on furniture:

1. the one measurement the whole system turns on, the `3σ` threshold in the hero
   rail;
2. the one thing every visitor must know, the simulated-data notice, which takes
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

- **Schibsted Grotesk Variable**, display and body. A neo-grotesque with a wide,
  open lower case that holds together set tight at display sizes.
- **Geist Mono Variable**, measurement only. Tabular figures are on wherever two
  numbers might be compared.

| Token | Value |
|---|---|
| `--text-title` | `clamp(1.5rem, 1.2rem + 1vw, 2rem)` |
| `--text-section` | `clamp(1.0625rem, 1rem + 0.35vw, 1.1875rem)` |
| `--text-body-lg` | `clamp(1.0625rem, 1rem + 0.3vw, 1.1875rem)` |
| `--text-body` | `1rem` |
| `--text-small` | `0.875rem` |
| `--text-label` | `0.75rem` |
| `--text-label-sm` | `0.6875rem` |

Tracking: `-0.03em` display, `-0.02em` title, `-0.01em` body, `0.13em` on mono
labels and `0.18em` on the small ones. Measure is `68ch` for body, `22ch` for the
display headline.

### The display step is not in the scale

It is the one size that does not belong to the viewport, so it is set on the
hero `<h1>` with arbitrary values rather than as a token:

- **Single column** (below `68rem`, the `xl` breakpoint): `clamp(2.5rem, 4.5vw, 4rem)`.
  Here the column *is* the viewport, so `vw` is the honest unit.
- **Two columns** (from `68rem`): `clamp(2.5rem, 10.4cqw, 5rem)`, against a
  `@container/lede` on the headline's column.

From `68rem` the headline sits in a grid column roughly half the viewport's width.
A viewport-fluid size makes the ratio of column width to type size drift as the
window narrows, which moves where the real headline breaks: with an earlier,
longer headline it produced a fourth line at 1100px carrying only the words "no
single". Container units hold that ratio constant. The current headline, "Find it
on day three, not day ten.", sets on two lines at every width measured from 375px
to 1440px. The two slopes are chosen to meet at the breakpoint, so the type does
not jump as the layout reflows (1087px → 48.92px, 1088px → 48.97px).

**Two rules learned the hard way, both from shipped bugs:**

- **A measure set in `ch` belongs on the element that carries the type**, not on its
  container. `ch` resolves against the element's own font size, so `max-width: 24ch`
  on a 16px wrapper clamps a whole column to ~235px on a phone.
- **Never apply `text-transform: uppercase` to a value.** Values carry units and
  proper nouns, and uppercasing silently turns `3.2σ` into `3.2Σ`, a different
  symbol. Terms may be uppercased; values may not. Mono plus tabular figures already
  supplies the technical register.

## Layout

```
split()               two equal columns, gap-2xl, from xl (68rem) up
split('center')       centres a text block against a figure
split('stretch')      stretches both columns to one shared height; pair with <Figure fill>
xl:order-2            on the first child, moves it to column two
--split-a/--split-b   shifts the divider for one section
```

`split()` lives in `src/styles/recipes.ts`. The breakpoints are `md` 48rem,
`lg` 60rem and `xl` 68rem, plus a `phone:` variant for `max-width: 30rem`.

The divider can move, the outer edges cannot. A section that genuinely needs an
uneven split sets `--split-a` / `--split-b`; the detection section does, at
`0.88fr / 1.12fr`, because its text column carries two sub-columns of its own.
Everything still starts and ends on the shell's gutters, so the page reads as
one grid.

**Why 68rem and not 60rem.** Below about 1088px the columns are too narrow to
carry a figure: the text column keeps growing as it narrows while the figure only
shrinks, so the two drift apart and leave exactly the dead space the split exists
to avoid. At 1000px wide the detection section reached a 500px imbalance. Stacked
is balanced by definition, so below the breakpoint the page stacks.

**`center` versus `stretch`.** `center` centres the shorter column against the
taller, which halves a small imbalance and puts what is left on both sides, where
it reads as margin. `stretch` goes further: both columns stretch to one shared
height, the figure frame drops its own aspect ratio and fills the row, and the
figure's top and bottom edges land on exactly the same lines as the text beside
it. The detection section uses `stretch`; measured top and bottom deltas between
figure and text are 0px.

**Why the detection text takes `xl:order-2`.** It moves the detection figure into
the left column, so from `68rem` the figures sit right, left, right, right down the
page (hero, detection, privacy, entry paths), while the DOM keeps heading-then-figure
order, so a screen reader and the stacked phone layout both get the heading first.

**Sections are not forced to fit one screen.** An earlier build budgeted the
detection and entry sections in `vh` so each fitted the viewport without
scrolling. It worked, and it made both sections feel compacted: the type went
small, the rhythm went tight, and the gain was one avoided scroll. Sections are
sized by their content again. Room to breathe beats a fitted screen.

## Imagery

Four figures, one per section. Three fill their own column, so they share a width
and a pair of edges. The privacy field sheet is the exception: it is a legend, not
the section's subject, so it is capped at `27rem` and centred in its column. From
`68rem` the figures sit hero right, detection left, privacy right, entry paths
right.

| Figure | Where | Why there |
|---|---|---|
| `dengue-vector` | Hero, right | Dengue is the symptom group the specification's worked example follows |
| `privacy-fields` | Privacy, right | The identifiers struck through and the operational fields kept: the same division the register below it spells out |
| `two-views` | Detection, left | Its own annotations, "isolated cases", "rainy season?", are the argument that section makes |
| `network-map` | Entry paths, right | The country, at the moment the page asks the visitor to pick their district |

**No visible captions.** The figures carry none. The disclosure they used to hold
now lives in two places: every alt text names its image an illustration, so a
reader who cannot see the drawing still learns it is not system output; and the
page's visible statement is the ochre-washed **"All case data simulated ·
demonstration system"** notice in the hero, which is where CLAUDE.md section 6a
wants it anyway. That notice is now the only visible disclosure on the page, so it
does not move and does not get quieter.

**A dark footer.** The footer takes the ink ground rather than another shade of
paper. A near-white footer under a near-white page reads as more page; ink gives
the page a definite end, and it is the colour the type has been all the way down.
Every rule and secondary tone inside it is re-derived from paper, because the
ink-alpha tokens are built for a light ground and vanish on this one. Selection
and the focus ring are re-themed there too.

**Two keying methods, because the cut-outs differ.** Three of the four originals
were exported as JPEG with their transparency baked in as a checkerboard. `scripts/build-images.py` keys that back
out two ways. For the drawings, the artwork is dark on a light checker, so
anything at or above the darker square is background and how far below it a pixel
sits gives its opacity; the last few percent is discarded as JPEG ringing.

That fails for the icon sheet, whose grey fills sit *just below* the darker checker
square and would be erased. Its artwork is opaque rather than a dark wash, so it is
keyed by value instead: the background takes exactly two levels, and anything
outside those two bands is artwork keeping its own colour. A morphological opening
then clears the speckle that survives between the bands, and an area filter removes
the specks that survive the opening whole, which otherwise reach the page as grey
flecks around the icons. On this sheet the largest speck is under 1,600 pixels and
the smallest real stroke over 23,000, so one threshold separates them cleanly. The
sheet's two rows are then found and restacked against a fixed gap, because the tall
empty band between them would otherwise ship as dead space inside a column.

**Trimmed to the artwork.** Each cut-out is then cropped to its own alpha bounding
box. The exports carry a wide empty margin, and left in, that margin ships as
whitespace inside the page's columns.

**`contain`, not `cover`, by default.** Cropping a trimmed cut-out just clips the
drawing. Opaque artwork opts into `cover` through the figure's `fit` prop. The
detection collage uses `fit="cover"` with `fill`: below `68rem` it shows at the
image's own square ratio, and from `68rem` the frame takes the text column's height,
which crops the square to between about 0.80:1 (at 1088px) and 1.09:1 (at 1440px).
All five of its labels stay in frame at both ends of that range; "rainy season?"
reaches the right edge at 1088px.

**Delivery.** WebP at 640/768/960 and up, with `srcset` and a real `sizes`. A phone
at 2× asks for 686px and takes the 768 variant of each, so the four figures cost
236 kB rather than the 320 kB the 960s would have.

**Images never shift the layout.** Every figure carries intrinsic `width`/`height`
and its frame has an `aspect-ratio`, so its space is reserved before any bytes
arrive. Measured CLS on load is 0.013 on a 375px phone and under 0.001 at 1280px,
all of it from the web fonts swapping in and nudging the hero text, and well inside
the 0.1 that counts as good.

**The ratio is a custom property, deliberately.** The component sets
`--figure-ratio` inline and the frame reads it through `aspect-(--figure-ratio)`.
An inline `aspect-ratio` would beat every class, and `<Figure fill>` needs
`xl:aspect-auto` to switch the ratio off at the wide breakpoint. The corollary:
an inline custom property cannot be overridden by a class on the same element
either, so a breakpoint that needs a different crop must change the `aspect-*`
utility, not reassign `--figure-ratio`. That bug shipped once here.

## Space and motion

A 4px-rooted scale, fluid at the larger steps: `--spacing-3xs` `0.25rem` through
`--spacing-3xl` `clamp(5rem, 3.4rem + 7vw, 9rem)`, used as `gap-xl`, `py-2xl` and
so on. The page gutter, `--spacing-gutter` (`px-gutter`), is
`clamp(1rem, 0.55rem + 2vw, 2.5rem)` and never drops below 16px. Shell max width
`84rem` (`max-w-shell`).

Easing is `cubic-bezier(0.16, 1, 0.3, 1)`, exponential ease-out, always from an
already-visible default. Nothing on the page animates in from nothing.

**One authored moment: the primary action takes its ink from the foot of the box
upward** on hover, rather than fading in, the control reads as being inked, not
lit. Everything else is 120–200ms and gets out of the way.
`prefers-reduced-motion: reduce` collapses the duration tokens to `1ms` at the token
level, so a component that forgets its own media query still respects the
preference. For that reason the durations are plain `--dur-fast` / `--dur-base` /
`--dur-slow` properties outside the theme, used as `duration-(--dur-fast)`.

**Hover is plain `:hover`.** Tailwind v4 wraps `hover:` in
`@media (hover: hover)` by default, which would stop hover styles applying on touch
screens. The theme restores a plain `:hover` so the page behaves as it always has.

## Components

- **Two action shapes, and no third.** A ruled box (`<Action>`) for the thing
  most visitors came to do; a quiet underlined link (`<Action variant="quiet">`)
  for everything else. A filled button would be a third voice.
- **The mono label** (the `labelSm` recipe, plus `caps` for terms) is the only
  place mono appears, and it always carries a measured value.
- **Rules, not cards.** Every rule is a 1px border in an ink alpha: hairline
  `border-ink-14`, faint `border-ink-08`, firm `border-ink-24`, full `border-ink`.
  There are no elevation tokens because nothing is elevated.
- **The privacy register is a description list.** Three bands, Removed entirely,
  Generalised and Kept, each a `<dt>` naming the fate and a `<dd>` whose fields run
  along the band rather than stacking into a narrow column. From `68rem` the fate
  sits beside its fields; below that it sits above them, so a phone loses nothing.

## Browser surfaces

Themed from the palette rather than left to the platform, in the base layer:
selection (ink ground, paper text), caret (ochre), `accent-color`, thin scrollbars
in ink-24, one 2px ink focus ring at 2px offset for the whole page, and a `0.28em`
underline offset on links.

## House style

**No em dashes.** Not in copy, comments, commits or documentation. A comma, a
colon, a semicolon, a full stop or brackets, whichever the sentence actually
needs; a middot (`·`) where a label wants a separator. A test fails the build
if one reaches the rendered page. Recorded in CLAUDE.md section 11.

## Accessibility floor

Verified on the built page, not asserted: every visible text node clears its WCAG
threshold (4.5:1 body, 3:1 large), every focusable element shows a visible focus
ring, there is no horizontal overflow from 375px up, one `<h1>` with no skipped
heading levels, and the privacy register keeps each fate above its fields on a
phone.
