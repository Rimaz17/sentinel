import { formatCount, formatDecimal } from '../format'
import type { Series } from './series'

const WIDTH = 220
const HEIGHT = 56
const PAD = 4

/**
 * An area's weekly report load as one line: nine weeks, the last seven days
 * marked with a dot, and the baseline average as a dashed rule, so the line's
 * end reads against the same comparison the detector makes. The panels below
 * it and their table carry the same numbers group by group.
 */
export function Sparkline({ series, areaName }: { series: Series; areaName: string }) {
  const { counts } = series
  const top = Math.max(1, ...counts, series.average) * 1.1
  const step = counts.length > 1 ? (WIDTH - PAD * 2) / (counts.length - 1) : 0
  const x = (index: number) => PAD + index * step
  const y = (count: number) => HEIGHT - PAD - (count / top) * (HEIGHT - PAD * 2)
  const points = counts.map((count, index) => `${x(index)},${y(count)}`)
  const last = counts.length - 1

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={`Weekly reports, ${areaName}, over ${counts.length} weeks, oldest first: ${counts
        .map(formatCount)
        .join(
          ', ',
        )}. The average of the weeks before the last 7 days is ${formatDecimal(series.average)}.`}
      className="h-[3.5rem] w-full max-w-[16rem] overflow-visible"
    >
      <polygon
        points={[`${x(0)},${HEIGHT - PAD}`, ...points, `${x(last)},${HEIGHT - PAD}`].join(' ')}
        className="fill-ink-04"
      />
      <line
        x1={PAD}
        x2={WIDTH - PAD}
        y1={y(series.average)}
        y2={y(series.average)}
        className="stroke-ink-40"
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        className="stroke-ink"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {last >= 0 ? (
        <circle
          cx={x(last)}
          cy={y(counts[last] ?? 0)}
          r={3}
          className="fill-ink stroke-card"
          strokeWidth={1.5}
        />
      ) : null}
    </svg>
  )
}
