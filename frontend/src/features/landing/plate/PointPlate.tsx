import { useMemo } from 'react'
import { pointField, type PointFieldMode } from './series'

const W = 1440
const H = 430
const REPORTS = 96
const SEED = 20260921

type PointPlateProps = { mode: PointFieldMode }

/**
 * Report positions across a district.
 *
 * These are drawn at plate scale, not at real coordinates — the public view
 * never plots a report where it actually happened, because a dot at a
 * pharmacy's exact location can reveal which household got sick. What the plate
 * shows is the shape of the distribution, which is the part that matters here.
 */
export function PointPlate({ mode }: PointPlateProps) {
  const field = useMemo(() => pointField(SEED, mode, REPORTS), [mode])

  return (
    <svg
      className="plate__svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      role="presentation"
    >
      <defs>
        {/* A faint survey grid, so the field reads as a mapped area rather than
            as scattered ink. */}
        <pattern id="plate-grid" width="72" height="72" patternUnits="userSpaceOnUse">
          <path
            d="M72 0 L0 0 0 72"
            fill="none"
            stroke="var(--ink)"
            strokeOpacity="0.06"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      <rect width={W} height={H} fill="url(#plate-grid)" />

      {field.ring ? (
        <g>
          {/* The two-kilometre radius the geographic check works at. */}
          <circle
            cx={field.ring.x * W}
            cy={field.ring.y * H}
            r={field.ring.r * H}
            fill="var(--ochre)"
            fillOpacity="0.07"
          />
          <circle
            cx={field.ring.x * W}
            cy={field.ring.y * H}
            r={field.ring.r * H}
            fill="none"
            stroke="var(--ochre)"
            strokeWidth="1.5"
            strokeDasharray="6 5"
          />
          {/* A leader and scale mark, so the ring states its own size. */}
          <line
            x1={field.ring.x * W}
            y1={field.ring.y * H}
            x2={field.ring.x * W + field.ring.r * H}
            y2={field.ring.y * H}
            stroke="var(--ochre)"
            strokeWidth="1"
          />
        </g>
      ) : null}

      <g>
        {field.points.map((p, i) => (
          <circle
            key={i}
            cx={p.x * W}
            cy={p.y * H}
            r={2.6 + (p.facility % 3) * 0.5}
            fill="var(--ink)"
            fillOpacity={0.5 + (p.facility % 4) * 0.1}
          />
        ))}
      </g>
    </svg>
  )
}
