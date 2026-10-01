# Design

<!-- Written from the built landing page, not ahead of it. Every value here is
     one that ships in the Tailwind theme in `sentinel/frontend/src/index.css`. -->

Sentinel's surfaces are **ink on paper**. The landing page is ruled: its structure
is carried by hairlines and weight, never by cards, shadows or rounded containers.
Every working page (both dashboards, report submission, the staff sign-in pages
and administration) is set as panels, soft rounded sheets on a low shadow; see
Components. A single ochre carries the page's attention, and is spent in exactly
two places.

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
`tnum`, `monoLink`); the look every form control shares is in
`src/components/ui/controls.ts` (`fieldLabel`, `fieldControl()`, `BUTTON`).

The migration from plain CSS was verified as rendering-identical: full-page
screenshots of every route at 375, 768, 1280 and 1440px match the plain-CSS
build pixel for pixel, and a computed-style comparison of every element, at seven
widths and under forced hover and focus, found no difference that draws.

## The world in one paragraph

A survey sheet. A set headline, a column of measured annotations in letter-spaced
monospace, and, on the landing page, content separated by rules rather than boxed
into panels. What keeps it from being editorial pastiche is that the annotations
are real: every mono string in running text is a count, a window, a threshold or a
district figure. The one other use of mono is the small caps label that names a
column, a status or a disclosure ("Reports · 7 days", "Shown once", "The numbers
as a table"); a mono string that is neither a measured value nor such a label is
in the wrong face. Form fields are no longer among them: since 2026-10-02 a
field's label is sentence case in the body face (see Staff pages).

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
| `--color-paper-raised` | `#f1f4f4` | Raised ground; the quiet well that holds a demo account's credentials |
| `--color-field` | `#ffffff` | Inside a form field and a white button, a step lighter than the card |
| `--color-paper-sunk` | `#dfe4e4` | The dashboard map's ground, behind the tiles |
| `--color-ink` | `#15222b` | Body text, rules at full strength, the footer ground |
| `--color-ochre` | `#8f6203` | The accent. Text-safe at 4.59:1 on paper |
| `--color-ochre-bright` | `#c88a05` | Reserved for marks on dark surfaces, 2.70:1 on paper, so never type there |
| `--color-alert` | `#e0443e` | The alert vocabulary only: the mark beside an open or active alert, always with a word, the fill of a public district with an active alert, always with a heavier outline, and the dashed cluster ring of an open alert on the internal map, always named by its code |

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

**A rule learned from a shipped bug: never narrow the shell with a second
max-width.** A max-width utility added beside the `shell` recipe loses to its
`max-w-shell`, whatever order the classes are written in. The first staff frame
asked for a `34rem` column that way; `max-w-shell` won, and every sign-in,
registration and activation field ran the full `84rem` with a void beside it. A
page that wants a narrower measure puts it on an element inside the shell, and a
form sizes its fields, not its column.

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

- **On the landing page, two action shapes.** A ruled box (`<Action>`) for the
  thing most visitors came to do; a quiet underlined link
  (`<Action variant="quiet">`) for everything else.
- **On the staff pages and the demo panels, two buttons** (`Button`,
  `ButtonLink`, `SubmitButton`), at the user's direction (2026-10-02) that the
  ruled mono box read as dated there. **Primary** is solid ink with paper text,
  sentence case in the body face at body size, on the control radius and as
  tall as a field (`2.75rem`), lightening to ink-85 under the pointer; it is the
  one thing a form is for, and below `30rem` it spans its column. **Secondary**
  is white with a hairline ink-24 edge and a contact shadow, `2.5rem` tall, at
  small size, for a helping step beside the primary one ("Try a demo account",
  "Use this account"). The quiet underlined button stays for small row actions
  in lists ("Disable", "Issue a code") and for "Sign out".
- **The mono label** (the `labelSm` recipe, plus `caps` for terms) is the only
  place mono appears, and it always carries a measured value.
- **Rules on the landing page, panels on the working pages.** Every rule is a 1px
  border in an ink alpha: hairline `border-ink-14`, faint `border-ink-08`, firm
  `border-ink-24`, full `border-ink`. The landing page stays ruled, with nothing
  elevated. The working pages (both dashboards, report submission, the staff
  sign-in pages and administration) are set as panels, at the user's direction
  from a reference layout, so a page reads as a set of sheets rather than one
  long column with wide gaps. One component, `Panel`, in one look: a
  `--color-card` (`#f7f9f9`) ground, a 1px `ink-08` border, `--radius-panel`
  (`0.875rem`) and `--shadow-panel` (a 1px contact shadow and a low, wide shadow
  offset downward).

  The sign-in pages were once boxed in a square 2px ink rule on the page's own
  paper, a second tone drawn from an early sketch. The user asked for them to
  match the dashboards instead (2026-10-01), and the tone was removed, so there
  is one kind of panel everywhere.

  Ink on the card ground is 15.34:1 and ink-70 5.82:1. Controls inside a panel
  (the district search, the map frame, the symptom tiles) take
  `--radius-control` (`0.5rem`). A panel is named by its heading (`PanelHeading`),
  so each is a labelled region.
- **The privacy register is a description list.** Three bands, Removed entirely,
  Generalised and Kept, each a `<dt>` naming the fate and a `<dd>` whose fields run
  along the band rather than stacking into a narrow column. From `68rem` the fate
  sits beside its fields; below that it sits above them, so a phone loses nothing.

## The internal dashboard

`/app` and `/app/districts/:code`, in **Operate** mode: the inspector is working,
so scanability and consistency outrank expression. The same palette and type as
the landing page, set as sheet panels.

- **Layout.** From `68rem`, two equal columns of panels: on the left the area
  summary, the alerts and the weekly reports; on the right the districts and the
  map. Alerts come straight after the summary because acting on them is the
  inspector's job. Below `68rem` one column in that order, the district list
  hidden and a labelled `<select>` in the summary panel instead.
- **The area summary** leads: the area's name as the `<h1>`, the province and
  code in mono caps, the last seven days as one large figure (proportional
  digits, so its comma sits tight), the open alerts in words beside a red or
  hollow square, and a sparkline of the area's nine weekly totals with the
  8-week average as a dashed rule, scaled to its own range so a change of a few
  percent still shows. Under it: "This week is 124% of the 8-week average".
- **The district list** sits in its own panel: a search ("Find a district") once
  there are more than six districts, a full-ink rule, then every district as a
  ruled row, the whole list at full length: an inner scroll that stopped on a row
  boundary read as a list that had ended. Each row carries the week's count in
  mono and a bar scaled to the busiest district's week; the total row has no bar,
  and an inspector who covers one district gets no total row, since it would
  only repeat their district. The district in view
  takes an ink-08 ground and medium weight and carries `aria-current="page"`.
- **The alert queue** is a ruled list under a full-ink top rule inside its panel.
- **Alert state is words first.** "Open · New", "Ended · New" or "Closed", with a
  filled alert-red square while open and a hollow ink-40 square after. Wording is
  the internal register: "A-1003, 55 reports, 4.3σ above baseline", with ",
  cluster confirmed across 7 facilities" when the geographic check found one.
  A "Where" row among the figures gives each cluster in words, or "No cluster:
  not bunched in any one place", or "Not checked for clusters" for an alert
  raised before the check existed.
- **The ochre is spent once**, on the simulated-data notice under the header,
  the same component as the landing page's (`SimulatedNotice`). Nothing on the
  dashboard is ochre otherwise.
- **The map** draws OpenStreetMap tiles in greyscale at 60% over paper-sunk, so
  the only colour on it is the symptom groups'. Report dots are 4px canvas
  circles in the group hue with a 1px paper halo; facilities are 6px ink rings.
  Its key doubles as its text alternative and lets each group be switched off.
- **Cluster rings.** Where the detector's geographic check found an open
  alert's reports bunched (ADR 0020), the map draws the ring it judged them in,
  2 km across the ground: alert red, 2px, dashed 6 on 4, with a 6% alert fill,
  drawn under the dots so every report inside stays visible. Its alert's code
  sits on the ring's northern edge in mono, so the colour never stands alone,
  and hovering anywhere in the ring gives the whole line. An ended alert's
  rings are not drawn, and switching a group off in the key takes its rings
  with it. Under a rule in the key, each ring is a line of words: "A-1003 ·
  Dengue-like · 17 reports within 2 km from 7 facilities, near Peradeniya; 5.6
  expected at its usual share". The ring is the only alert red on the map, and
  it is never shown on the public dashboard.
- **The chart** is four small multiples, one per symptom group: nine weekly
  columns, the eight baseline weeks at 32% of the group hue, the last seven days
  at full hue, a dashed ink line at the baseline mean, and a figure only on the
  current week, haloed in paper so the line never runs through it. Columns stay
  near 24px wide with a 4px rounded top and square foot. Every panel is named in
  text, and the numbers are one click away as a table.
- **States.** Every panel shows ruled skeleton rows while loading, the reason and
  a "Try again" while failing, a teaching empty state, and, when a later poll
  fails, the last good figures with a line giving their time.
- **One action shape added, none invented.** "Refresh now" and "Try again" are the
  landing page's quiet underlined action as a `<button>` (`QuietButton`).
- **Freshness is words.** The header's mono line says when the figures were
  updated, how often they refresh, and how alerts arrive: "alerts arrive live",
  "connecting for live alerts" or "live alerts reconnecting". No dot or colour
  marks the socket's state. A newly raised alert is also read out, from a
  visually hidden status region: "New alert A-1002: Kandy, dengue-like."

**The group hues were validated, and two pairs are close.** On the paper ground
the dataviz validator finds gastrointestinal and leptospirosis-like at ΔE 11 for
normal vision (floor 15) and dengue-like and influenza-like at ΔE 6.0 under
deuteranopia. The hues are fixed, so no view depends on them: panels are named,
alerts name their group, and the map key's switches let a reader isolate a group.

Verified in the browser at 375px and 1440px against a live backfill: no
horizontal overflow, one `<h1>`, every control named, and every visible text node
at 4.5:1 or better.

### Alert review

Each alert in the queue ends with its actions as quiet buttons: the next step
("Acknowledge", then "Start investigating"), the two verdicts and "Close". A
verdict is final and one of them publishes the alert, so it asks once more in
place, under a 2px ink rule, before anything is sent. A line under the figures
says in words whether the public sees the alert and why.

## The public dashboard

`/dashboard`, in **Read** mode: a resident wants to know whether anything unusual
is happening where they live, and then to leave. Set as sheet panels, like the
internal dashboard.

- **Three rows of panels.** From `68rem`: the summary beside the alerts, the alerts
  panel sized to its own content rather than stretched into an empty sheet; then
  "Every district" across the full width, the map beside the table and as tall as
  it, so neither half leaves a void; then the weekly reports across the full
  width, the four groups in one row.
  Below `68rem` one column in that order.
- **The visitor's district first.** The summary panel carries the title, lede
  and simulated-data notice, then under a hairline the national summary, a
  "figures updated" line and the "Your district" picker. Once a district is
  chosen, its answer sits directly under them, one sentence, and takes focus, so
  a phone user sees it without scrolling and a screen reader hears it.
- **The alert vocabulary, publicly.** An active alert is the red square with the
  word "Active" and the plain headline, which links to its district. Ended alerts
  wait in a `<details>` for a season. Nothing public carries a count, a sigma or
  an alert code.
- **The map is a picture.** Twenty-five district outlines on paper-sunk, no tile
  layer, no zoom control, no panning. A district with an active alert takes a
  45% alert-red fill and a 2px ink outline, so the difference is in the line as
  well as the hue; the one chosen is drawn at 3px. It is `aria-hidden` and out of
  the tab order, because the table beside it says the same in words, and it
  loads after the text so a slow phone reads the answer first. Its credit is a
  mono caption in ink, not Leaflet's blue.
- **The table is the map's equal.** Elevated districts first, status in words,
  and the district chosen inked in (paper on ink), as the internal rail marks the
  district in view.
- **Failures speak to the public.** "The figures are unavailable at the moment.
  Try again in a minute." rather than the staff wording about the API.

## Staff pages

Sign-in, registration and activation share one frame, `AuthPage`: the site header
and footer around the landing page's **shared 50/50 grid** with an `lg` gap, `lg`
below the header rather than `2xl`, so the two halves start close under it.
Administration and submission take a thin staff header instead: the wordmark, the
section, "Signed in as", a quiet "Sign out", and the simulated-data notice
beneath.

- **The frame: two sheets.** Each half is a sheet panel, as on the dashboards.
  From `68rem` they stand side by side, their tops and feet level (the grid
  stretches both to one height): the left sheet carries the title, the intro, the
  rail and then the notes in small ink-70; the right sheet carries the form.
  Below `68rem` the form's sheet follows the other.
- **Where you are, as a rail.** Registration and activation carry a `StepRail`:
  the steps in order under a full ink rule, each a ruled row with a two-digit
  mono number (`01`, `02`, `03`). A step is done, current or next. The current
  step is inked in, paper on ink, as the dashboard's district rail marks the
  district in view, and carries `aria-current="step"`; a next step drops to
  ink-70; a done step shows what it settled in mono at the row's end (the invite
  code, the account's email), truncated rather than wrapped. The state is also
  said in words to a screen reader ("current step", "done", "still to come"),
  never by the ground alone.
- **Who goes where, as a key.** Sign-in carries a `RouteList` instead: the same
  full ink rule and ruled rows, but unnumbered, because the roles are
  alternatives, not a sequence, and with its text on the column edge rather than
  inset. The rows go nowhere, so they read as a key, like the notes under them,
  not as a menu to click.
- **Fields are as wide as what goes in them**, never the column's width. Four
  tokens, used as `max-w-field-*` through `Field`'s `width` prop:

  | Token | Value | For |
  |---|---|---|
  | `--container-field-sm` | `9rem` | A short number. Unused since report submission set its fields in a grid, where each fills its cell |
  | `--container-field-code` | `16rem` | An invite code |
  | `--container-field` | `20rem` | A password being set on activation. Below `48rem` it fills the column, level with the button |
  | `--container-field-lg` | `28rem` | An email address, and the fields sharing a box with one |

  A field with no `width` takes its column. Where fields stand one above another
  in a sign-in or registration box, they share one width (`field-lg`), so their
  right edges line up; the widths differ only where fields do not stack together.
  A field packs to the top of its grid cell, so two fields side by side keep their
  inputs on one edge even when only one has a hint.
- **Hints sit beside a sized input** where there is room, centred against it, and
  drop under it when the row cannot hold the input and a `12rem` hint. The invite
  code's hint sits beside its box on a wide screen and under it on a phone. A field
  with no width keeps its hint under the input.
- **Fields** are a sentence-case label in the body face (small, medium weight,
  full ink), the optional hint in ink-70, and a white box (`--color-field`) on
  the control radius with a 1px contact shadow. Its edge is ink-55, 3.72:1 on
  white, so the box's boundary passes the 3:1 a control needs; it darkens to
  ink-70 under the pointer and goes to full ink with focus, inside the page's
  usual focus ring. A refused field keeps its edge at full ink and says why
  underneath, beside a 2px ink rule, never in colour alone. A select is the same
  box with the platform's arrow hidden and a drawn chevron in its place
  (`Select`), and the same look carries to every search and picker: the
  facility filters, the account search, and both dashboards' district pickers.
  Group labels (`<legend>`: "Symptom group", "Districts covered") take the
  field label's style, and the choice tiles take the white ground.
- **Values are set in the value face** where they sit in running text: a facility
  number, and the invite code's example in its hint, are Geist Mono; the words
  around them stay Schibsted. The demo panels are the exception: their
  credentials are for reading and typing, so they sit in the body face.
- **Submit** is the solid primary button. When a visitor reaches sign-in already
  signed in, "Continue" is the same solid button as a link (`ButtonLink`)
  beside a quiet "Sign out", because continuing is the thing they came to do.
- **A secret shown once**, an invite code or an activation link, sits on its own
  panel, headed with what it is and "Shown once" in mono caps: the value in mono
  in a full-ink rounded box, who it is for, then "Copy" and "Done". The panel takes
  focus as it appears, so a secret issued from a row far down a list is scrolled
  to and read out. It is never shown again.

**Administration is two panels a section.** `/app/admin` and
`/app/admin/facilities` sit under a pair of section tabs, each a rounded control
chip in mono caps; the section in view is inked in, paper on ink, as the step
rail marks the current step, and carries `aria-current="page"`. Each section is
then the same pair of panels, from `68rem` 2 parts to 3:

- **Left, what you do.** The section's `<h1>` and its intro, then under a hairline
  the new inspector form, or the district and name filters. The filters' panel is
  sticky from `68rem`, so they stay in reach while a district's seventy-odd
  facilities scroll beside them.
- **Right, what there is.** A panel headed "Accounts" or "Facilities in Colombo"
  with its count in mono at the heading's end, and above it, while one is
  showing, the secret shown once. Accounts are grouped by role, inspectors
  first, each group a small heading with its count over a full-ink rule; past six
  accounts a "Find an account" search filters by name or email. A row carries
  the name, the email in mono, what the account reaches in words ("Covers Kandy",
  "Reports for Infectious Diseases Hospital, Angoda"), its state in mono, and its
  actions as quiet buttons at the row's end from `48rem`.
- **Choosing districts.** "Every district: a national inspector" is a tile, like
  the symptom group tiles, because it is the either-or that decides the rest;
  under it all 25 districts show at once in three columns (two on a phone), with
  no inner scroll, and a mono count of those chosen.

**Demo mode adds a panel under the staff frame.** When the API runs in demo mode
(ADR 0017), sign-in and registration each carry one more sheet panel across the
full width under their two halves. Nothing about it shows otherwise.

- **"Demo accounts"** on sign-in: a heading, a line on how it works and when it
  resets, and the simulated-data notice on its right, the page's one spend of
  ochre. Under a full-ink rule, the four accounts side by side from `88rem`,
  the first width at which the longest demo email fits its column on one line
  (two by two from `48rem`, stacked and parted by hairlines on a phone). Each is
  a column of five rows on one shared grid (CSS subgrid), so every row starts on
  the same line across the columns and the space between rows is the same in
  each: the role ("Public health inspector"), its reach as a small rounded chip
  ("Colombo only"), one sentence of what signing in shows (the four are kept to
  about the same length), the email and password in a quiet paper-raised well
  in the body face at medium weight (emails wrap before their `@`, never
  mid-word), and a white "Use this account" button, which fills the form, moves
  focus to "Sign in" and says so in a status line under the fields; it never
  signs in by itself.
- **"Try a demo account"** on the sign-in form: under a hairline below "Sign
  in", one line and a white button that scrolls to the demo accounts and moves
  focus to their heading, smoothly unless the visitor prefers reduced motion.
- **"Demo invite code"** on registration: the same head, then the code and its
  facility in the same quiet well, and a white "Use this code", which fills the
  first step and moves focus to "Check the code". Beside it, in medium weight, the request to
  use a made-up name and email address. Once the code is accepted the button
  goes and the request stays.
- **In administration**, the demo administrator's header says what is switched
  off and when the reset comes, and a row it may not change keeps its quiet
  buttons, disabled, with "Switched off in the demo" in mono under them. A
  disabled quiet button loses its underline, so it no longer reads as live.

**Report submission is one form panel.** `/submit` has no rail: submission is a
repeated single-screen task inside a shift, not a sequence, so a step rail there
would be a costume. From `68rem` a wide sheet panel (3 parts to 2) holds the form
beside a narrower "Submitted this session" panel, which counts the reports sent.
Inside the form, sections part at hairlines and every field fills its grid cell,
so all edges line up:

1. the symptom group as four tiles, two by two (one per row on a phone): each a
   rounded, ruled box with its radio, its group swatch and its name; the chosen
   tile takes a full-ink border, an ink-08 ground and medium weight;
2. "When the patient presented" beside "Age in years";
3. "Where the patient lives, if known", latitude beside longitude;
4. a footer bar: the privacy sentence on the left, the ruled "Submit report" box
   on the right.

Every field input is one height (`2.75rem`), so the date control sits level with
the number beside it. The location group's rule is on a wrapper, not the
fieldset, where browsers draw the legend through the line.

## Browser surfaces

Themed from the palette rather than left to the platform, in the base layer:
selection (ink ground, paper text), caret (ochre), `accent-color`, thin scrollbars
in ink-24, one 2px ink focus ring at 2px offset for the whole page, and a `0.28em`
underline offset on links. The date and time picker's own glyph, which the
platform draws in black, is taken down to 70% (the secondary ink) and back to full
ink under the pointer or the input's focus.

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
