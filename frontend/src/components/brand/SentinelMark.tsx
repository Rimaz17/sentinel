/*
 * The Sentinel mark.
 *
 * It is the product's own mechanism drawn at 24px: a week of counts running
 * along a baseline, with one reading breaking through it. Only the area above
 * the baseline is filled, because that area is the entire point — the signal is
 * the part that leaves the normal range.
 *
 * Drawn rather than borrowed, in one stroke weight, so it holds at 16px in a
 * browser tab and at 40px in the header.
 */

type SentinelMarkProps = {
  /** Rendered size in px. The mark is drawn on a 24-unit grid and scales cleanly. */
  size?: number
  className?: string
}

/* The weekly trace. Baseline sits at y = 14; smaller y is a higher count. */
const TRACE = 'M1 17 L4 16 L7 17.4 L10 15.5 L12.5 4.5 L15 15.5 L18 16.8 L21 16 L23 17'

/* The part of the trace above the baseline, closed against it. The two x values
   are where the trace crosses y = 14, solved from the segments either side of
   the peak. */
const EXCEEDANCE = 'M10.34 14 L12.5 4.5 L14.66 14 Z'

export function SentinelMark({ size = 24, className }: SentinelMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
    >
      {/* The baseline: what a normal week looks like for this area. */}
      <line x1="1" y1="14" x2="23" y2="14" strokeWidth={1} opacity={0.45} />
      {/* The exceedance, filled. */}
      <path d={EXCEEDANCE} fill="currentColor" stroke="none" />
      {/* The week's readings. */}
      <path d={TRACE} />
    </svg>
  )
}
