/*
 * Class recipes: the few utility sets the page repeats often enough that they
 * are named once rather than copied.
 *
 * Every string here is a complete literal, because Tailwind finds classes by
 * scanning source text and cannot see a class assembled at runtime. Recipes
 * never set colour: callers add it, so no element ends up carrying two
 * competing colour utilities.
 */

/**
 * Joins class names, dropping empty and false entries. Returns undefined rather
 * than an empty string, so an element with no classes renders no attribute.
 */
export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ') || undefined
}

/** The page column: full width up to the shell, with the fluid gutter. */
export const shell = 'mx-auto w-full max-w-shell px-gutter'

/*
 * The page's one two-column grid.
 *
 * Every section that splits in two uses this, at the same ratio and the same
 * gap, so the column edges line up from the header to the footer. Sections
 * inventing their own ratios is what made the page read as unaligned.
 *
 * Equal by default. A section can shift the divider by setting `--split-a` and
 * `--split-b`; the outer edges stay on the shell's gutters either way, so the
 * page still reads as one grid.
 */
export const SPLIT_COLUMNS =
  'xl:grid-cols-[minmax(0,var(--split-a,1fr))_minmax(0,var(--split-b,1fr))]'

const SPLIT_ALIGN = {
  start: 'xl:items-start',
  /* A block of text paired with a figure. Centred against each other, because
     the shorter of the two otherwise leaves a tall void beside the taller,
     which is the single biggest source of dead space on a page like this. */
  center: 'xl:items-center',
  /* Both columns share one height, so a figure's top and bottom edges land on
     exactly the same lines as the text beside it. Pair with `<Figure fill>`. */
  stretch: 'xl:items-stretch',
} as const

export function split(align: keyof typeof SPLIT_ALIGN = 'start') {
  return cx('grid gap-xl xl:gap-2xl', SPLIT_COLUMNS, SPLIT_ALIGN[align])
}

/** One size for every section heading. Callers set the measure. */
export const sectionTitle = 'text-title leading-title font-medium tracking-title'

/** Any figure a reader might compare against another figure is tabular. */
export const tnum = "tabular-nums [font-feature-settings:'tnum'_1]"

/**
 * The small mono label. It always carries a real measured value or a status,
 * never decoration. Add `caps` for the uppercase form; values that carry units
 * or proper nouns stay in their own case, because uppercasing turns 3σ into 3Σ.
 */
export const labelSm =
  "font-mono text-label-sm leading-[1.45] font-medium tabular-nums [font-feature-settings:'tnum'_1]"
export const caps = 'tracking-label-wide uppercase'

/** The mono voice shared by every navigational link on the page. */
export const monoLink = 'font-mono text-label tracking-label uppercase'
