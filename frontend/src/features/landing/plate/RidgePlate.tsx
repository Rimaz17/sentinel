import { useMemo } from 'react'
import { ridgeArea, ridgeLine, type Frame } from './geometry'
import { ridgeField, type RidgeFieldMode } from './series'

/* The viewBox aspect is kept close to the stage's own aspect. The stage uses
   `slice`, so a viewBox much taller than the stage crops the top of the frame —
   which is exactly where the peak is. */
const FRAME: Frame = { width: 1440, height: 430, baseline: 339, amplitude: 98 }
const DISTRICTS = 25
const SAMPLES = 44
const SEED = 20260921

/** Back ridges sit higher in the frame; front ridges sit at the baseline. */
const liftFor = (depth: number) => (1 - depth) * 97

/** Ridges at or beyond this depth are foreground: they stand in front of the
    band rather than being veiled by it. */
const FOREGROUND_FROM = 0.86

/** The band of normal weekly counts, in frame units. */
const BAND_TOP = 227
const BAND_BOTTOM = 355

/** The near foreground gets its own baseline, well below the frame, so it reads
    as a low ridge across the foot of the plate rather than as a slab of ink. */
const FOREGROUND_FRAME: Frame = { width: 1440, height: 430, baseline: 435, amplitude: 80 }

type RidgePlateProps = { mode: RidgeFieldMode }

/**
 * Twenty-five district traces, layered back to front, with the normal range
 * drawn across them as a band of paper.
 *
 * A district inside its range is veiled by the band. A district outside it is
 * not — it is the only thing that stays legible above the line. That is the
 * detection rule drawn once, rather than described.
 *
 * Draw order matters and is the whole trick: background field, then the band,
 * then the district that broke out, then the near foreground. Painting the
 * exceeding ridge last and opaque would flatten the field into one mass.
 */
export function RidgePlate({ mode }: RidgePlateProps) {
  const ridges = useMemo(() => ridgeField(SEED, DISTRICTS, SAMPLES, mode), [mode])

  const background = ridges.filter((r) => !r.exceeding && r.depth < FOREGROUND_FROM)
  const foreground = ridges.filter((r) => !r.exceeding && r.depth >= FOREGROUND_FROM)
  const exceeding = ridges.filter((r) => r.exceeding)

  return (
    <svg
      className="plate__svg"
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      preserveAspectRatio="xMidYMax slice"
      role="presentation"
    >
      <defs>
        <linearGradient
          id="plate-band"
          x1="0"
          y1={BAND_TOP}
          x2="0"
          y2={BAND_BOTTOM}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--paper)" stopOpacity="0" />
          <stop offset="38%" stopColor="var(--paper)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="var(--paper)" stopOpacity="1" />
        </linearGradient>

        {/* The exceeding ridge is solid at its crest and dissolves into the band,
            so it reads as rising out of the normal range rather than sitting on
            top of the picture. */}
        <linearGradient
          id="plate-exceed"
          x1="0"
          y1="108"
          x2="0"
          y2={BAND_BOTTOM}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.93" />
          <stop offset="62%" stopColor="var(--ink)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
        </linearGradient>

        {/* The accent is clipped to the region above the threshold, so ochre
            appears on exactly the part of the trace that left the normal range
            and nowhere else. */}
        <clipPath id="plate-above-threshold">
          <rect x="0" y="0" width={FRAME.width} height={BAND_TOP} />
        </clipPath>
      </defs>

      {/* The field, back to front. Tone deepens as the ridges come forward,
          which is what gives the plate its depth without a single blur. */}
      <g>
        {background.map((ridge, i) => (
          <path
            key={i}
            d={ridgeArea(ridge.values, FRAME, liftFor(ridge.depth))}
            fill="var(--ink)"
            fillOpacity={0.07 + ridge.depth * 0.3}
          />
        ))}
      </g>

      {/* The normal range, laid over the field. */}
      <rect
        x="0"
        y={BAND_TOP}
        width={FRAME.width}
        height={BAND_BOTTOM - BAND_TOP}
        fill="url(#plate-band)"
      />
      <rect
        x="0"
        y={BAND_BOTTOM}
        width={FRAME.width}
        height={FRAME.height - BAND_BOTTOM}
        fill="var(--paper)"
      />

      {/* The threshold. Dashed, so it reads as a rule rather than as terrain. */}
      <line
        x1="0"
        y1={BAND_TOP}
        x2={FRAME.width}
        y2={BAND_TOP}
        stroke="var(--ink)"
        strokeOpacity="0.42"
        strokeWidth="1"
        strokeDasharray="3 7"
      />

      {/* The district that left its range. Marked three ways — it is the tallest
          thing in the frame, its crest is drawn heavier than any other, and it
          carries the accent — so the signal never depends on colour alone. */}
      {exceeding.map((ridge, i) => (
        <g key={`exceeding-${i}`}>
          <path
            d={ridgeArea(ridge.values, FRAME, liftFor(ridge.depth))}
            fill="url(#plate-exceed)"
          />
          <g clipPath="url(#plate-above-threshold)">
            <path
              d={ridgeLine(ridge.values, FRAME, liftFor(ridge.depth))}
              fill="none"
              stroke="var(--ochre)"
              strokeWidth="2.25"
              strokeLinecap="round"
            />
          </g>
        </g>
      ))}

      {/* The near foreground, in front of the band. */}
      <g>
        {foreground.map((ridge, i) => (
          <path
            key={`fg-${i}`}
            d={ridgeArea(ridge.values, FOREGROUND_FRAME)}
            fill="var(--ink)"
            fillOpacity={0.5 + (ridge.depth - FOREGROUND_FROM) * 2.2}
          />
        ))}
      </g>
    </svg>
  )
}
