import { useMemo } from 'react'
import { ridgeArea, ridgeLine, type Frame } from './geometry'
import { ridgeField, type RidgeFieldMode } from './series'

const FRAME: Frame = { width: 1440, height: 560, baseline: 442, amplitude: 128 }
const DISTRICTS = 25
const SAMPLES = 44
const SEED = 20260921

/** Back ridges sit higher in the frame; front ridges sit at the baseline. */
const liftFor = (depth: number) => (1 - depth) * 126

/** The shaded normal range, expressed in frame units either side of baseline. */
const BAND_TOP = FRAME.baseline - 96
const BAND_BOTTOM = FRAME.baseline + 30

type RidgePlateProps = { mode: RidgeFieldMode }

/**
 * Twenty-five district traces layered back to front, with the normal range
 * drawn over them as a band of paper so that only what rises clear of it stays
 * visible. A district inside its range is veiled; a district outside it is not.
 * That is the whole detection rule, drawn once.
 */
export function RidgePlate({ mode }: RidgePlateProps) {
  const ridges = useMemo(() => ridgeField(SEED, DISTRICTS, SAMPLES, mode), [mode])

  return (
    <svg
      className="plate__svg"
      viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
      preserveAspectRatio="xMidYMax slice"
      role="presentation"
    >
      <defs>
        <linearGradient id="plate-band" x1="0" y1={BAND_TOP} x2="0" y2={BAND_BOTTOM} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--paper)" stopOpacity="0" />
          <stop offset="46%" stopColor="var(--paper)" stopOpacity="0.72" />
          <stop offset="100%" stopColor="var(--paper)" stopOpacity="0.97" />
        </linearGradient>
      </defs>

      {/* The field, back to front. Tone deepens as the ridges come forward,
          which is what gives the plate its depth without a single blur. */}
      <g>
        {ridges
          .filter((r) => !r.exceeding)
          .map((ridge, i) => (
            <path
              key={i}
              d={ridgeArea(ridge.values, FRAME, liftFor(ridge.depth))}
              fill="var(--ink)"
              fillOpacity={0.07 + ridge.depth * 0.5}
            />
          ))}
      </g>

      {/* The normal range, laid over the field. */}
      <rect x="0" y={BAND_TOP} width={FRAME.width} height={BAND_BOTTOM - BAND_TOP} fill="url(#plate-band)" />
      <rect x="0" y={BAND_BOTTOM} width={FRAME.width} height={FRAME.height - BAND_BOTTOM} fill="var(--paper)" fillOpacity="0.97" />

      {/* The threshold itself. */}
      <line
        x1="0"
        y1={BAND_TOP}
        x2={FRAME.width}
        y2={BAND_TOP}
        stroke="var(--ink)"
        strokeOpacity="0.32"
        strokeWidth="1"
        strokeDasharray="2 5"
      />

      {/* The one district that left its range, drawn last so nothing veils it.
          It is marked three ways — height, a heavier crest, and the accent —
          so the signal never depends on colour alone. */}
      {ridges
        .filter((r) => r.exceeding)
        .map((ridge, i) => (
          <g key={`exceeding-${i}`}>
            <path
              d={ridgeArea(ridge.values, FRAME, liftFor(ridge.depth))}
              fill="var(--ink)"
              fillOpacity="0.9"
            />
            <path
              d={ridgeLine(ridge.values, FRAME, liftFor(ridge.depth))}
              fill="none"
              stroke="var(--ochre)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </g>
        ))}
    </svg>
  )
}
