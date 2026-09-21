/*
 * The four plates.
 *
 * They are not decoration and they are not four views of the same thing. They
 * are the two checks Sentinel actually runs, each shown against its own
 * counter-example:
 *
 *   01/02  the baseline comparison — a district at rest, then the same district
 *          leaving its own range
 *   03/04  the geographic check — reports knotted inside two kilometres, then
 *          the same number of reports spread across a district with no hotspot
 *
 * Every figure quoted below comes from the project specification. None of it is
 * invented, and all of it describes simulated data.
 */

export type PlateKind = 'ridge' | 'points'

export type Plate = {
  id: string
  /** Shown in the switcher, e.g. "01". */
  ordinal: string
  /** Shown in the switcher, e.g. "BASELINE". */
  name: string
  kind: PlateKind
  /** Which variant the generator should produce. */
  variant: 'baseline' | 'signal' | 'cluster' | 'spread'
  /** The sentence under the plate. Plain language, no jargon left unexplained. */
  caption: string
  /** The measurement the rail reads out while this plate is active. */
  readout: { label: string; value: string; note: string }
  /**
   * The plate's text alternative. A visitor using a screen reader gets this
   * instead of the drawing, and it has to carry the same information — not a
   * description of what the picture looks like.
   */
  alt: string
}

export const PLATES: readonly Plate[] = [
  {
    id: 'baseline',
    ordinal: '01',
    name: 'Baseline',
    kind: 'ridge',
    variant: 'baseline',
    caption:
      'Each district is measured against its own previous eight weeks, not against other districts. Forty dengue cases a week is ordinary for Colombo and highly unusual for Nuwara Eliya.',
    readout: { label: 'All districts', value: 'In range', note: '25 districts · 8-week baseline' },
    alt: 'Twenty-five district traces layered from back to front, all of them sitting inside the shaded normal range. No district is above its baseline.',
  },
  {
    id: 'signal',
    ordinal: '02',
    name: 'Signal',
    kind: 'ridge',
    variant: 'signal',
    caption:
      'One district rises clear of its own normal range. Twelve facilities around Kandy usually see twenty-five dengue-like cases a week between them; in the first outbreak week they saw eighty-seven, and no single facility saw more than eleven.',
    readout: { label: 'Kandy', value: '3.2σ', note: '41 reports · baseline 25, range 20–30' },
    alt: 'The same twenty-five district traces, with one — Kandy — rising well clear of the shaded normal range at 3.2 standard deviations above its baseline: 41 reports against a baseline of 25.',
  },
  {
    id: 'cluster',
    ordinal: '03',
    name: 'Cluster',
    kind: 'points',
    variant: 'cluster',
    caption:
      'A second check runs alongside the first. Reports bunched within about two kilometres, arriving from several different facilities, suggest a real local outbreak rather than a wider seasonal wave.',
    readout: { label: 'Kandy', value: '17 in 2 km', note: 'across 7 facilities · detected at 50h' },
    alt: 'Report positions across a district. Seventeen of them fall inside a two-kilometre ring, arriving from seven different facilities — a tight cluster from many sources.',
  },
  {
    id: 'spread',
    ordinal: '04',
    name: 'Spread',
    kind: 'points',
    variant: 'spread',
    caption:
      'The same rise with no hotspot reads differently. An influenza-like wave across Colombo was detected at seventy hours with no significant cluster — district-wide spread rather than a point source. The distinction changes the response.',
    readout: { label: 'Colombo', value: 'No cluster', note: 'district-wide · detected at 70h' },
    alt: 'Report positions spread evenly across a district with no ring and no hotspot: a district-wide influenza-like wave rather than a single point source.',
  },
]

export const DEFAULT_PLATE_ID = 'signal'
