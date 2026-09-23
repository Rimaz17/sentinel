/*
 * The Sentinel mark.
 *
 * It is the product's own mechanism drawn at 24px: a week of counts running
 * along a baseline, with one reading breaking through it. Only the area above
 * the baseline is filled, because that area is the entire point: the signal is
 * the part that leaves the normal range.
 *
 * Drawn rather than borrowed, in one stroke weight. The flanking readings are
 * deliberately shallow and the exceedance deliberately narrow: at 16px in a
 * browser tab, a busy trace collapses into a smudge, while one tall spike
 * crossing one horizontal rule still reads.
 */

type SentinelMarkProps = {
  /** Rendered size in px. The mark is drawn on a 24-unit grid and scales cleanly. */
  size?: number
  className?: string | undefined
}

/** The week's readings. Baseline sits at y = 14; smaller y is a higher count. */
const TRACE = 'M1 16.6 L4.2 16 L7.4 16.9 L10.2 15.8 L12 5.2 L13.8 15.8 L16.6 16.9 L19.8 16 L23 16.6'

/* The part of the trace above the baseline, closed against it. The two x values
   are where the trace crosses y = 14, solved from the segments either side of
   the peak. */
const EXCEEDANCE = 'M10.506 14 L12 5.2 L13.494 14 Z'

export function SentinelMark({ size = 24, className }: SentinelMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="square"
      strokeLinejoin="miter"
      /* The apex is a ~19 degree angle. The default miter limit of 4 bevels
         anything under ~29 degrees, which flattens the spike into a stub. */
      strokeMiterlimit={10}
      aria-hidden="true"
      focusable="false"
    >
      {/* The baseline: what a normal week looks like for this area. */}
      <line x1="1" y1="14" x2="23" y2="14" strokeWidth={1} opacity={0.42} />
      {/* The exceedance, filled. */}
      <path d={EXCEEDANCE} fill="currentColor" stroke="none" />
      {/* The week's readings. */}
      <path d={TRACE} />
    </svg>
  )
}
