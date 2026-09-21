/*
 * Deterministic series behind the plate.
 *
 * Everything the plate draws comes from a seeded generator, so the same plate
 * renders on every reload, in every browser and in the tests. None of it is
 * real case data — it is a drawing of the mechanism, generated to the shape the
 * simulator produces, and it is labelled simulated wherever it appears.
 */

/** Small, fast, seedable PRNG. Same seed in, same sequence out. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** Repeated moving average. Turns white noise into something terrain-shaped. */
function smooth(values: readonly number[], passes: number): number[] {
  let out = [...values]
  for (let p = 0; p < passes; p += 1) {
    const next = out.map((_, i) => {
      const a = out[i - 1] ?? out[i] ?? 0
      const b = out[i] ?? 0
      const c = out[i + 1] ?? out[i] ?? 0
      return (a + b + c) / 3
    })
    out = next
  }
  return out
}

export type RidgeSeries = {
  /** Normalised 0..1 samples, one per time step. */
  values: number[]
  /** 0 = furthest back and palest, 1 = frontmost and densest. */
  depth: number
  /** True for the one district that leaves its baseline range. */
  exceeding: boolean
}

export type RidgeFieldMode = 'baseline' | 'signal'

/**
 * One ridge per district, ordered back to front.
 *
 * In `signal` mode a single district is pushed well above the band — the
 * drawing of "this area moved outside its own normal range". In `baseline`
 * mode the same field is generated with the same seed and nothing breaks out,
 * so switching between the two plates changes one thing and holds the rest.
 */
export function ridgeField(
  seed: number,
  count: number,
  samples: number,
  mode: RidgeFieldMode,
): RidgeSeries[] {
  const rand = mulberry32(seed)
  const exceedingIndex = Math.floor(count * 0.62)

  return Array.from({ length: count }, (_, i) => {
    const depth = count === 1 ? 1 : i / (count - 1)

    const raw = Array.from({ length: samples }, () => rand())
    const base = smooth(raw, 3)

    // Ridges further forward sit lower and carry a little more relief, which is
    // what gives the field its depth without any blur.
    const relief = 0.26 + depth * 0.42
    const floor = 0.06 + depth * 0.1

    const values = base.map((v) => floor + v * relief)

    const exceeding = mode === 'signal' && i === exceedingIndex
    if (exceeding) {
      // A single sustained rise, not a spike: the shape the detector actually
      // sees over a seven-day window.
      const peak = Math.floor(samples * 0.58)
      const width = Math.max(3, Math.floor(samples * 0.2))
      for (let s = 0; s < samples; s += 1) {
        const d = Math.abs(s - peak) / width
        if (d < 1) {
          const lift = Math.cos((d * Math.PI) / 2) ** 2
          values[s] = (values[s] ?? 0) + lift * 0.64
        }
      }
    }

    return { values, depth, exceeding }
  })
}

export type FieldPoint = {
  /** Normalised 0..1 within the plate frame. */
  x: number
  y: number
  /** Which of the facilities reported it; drives the mark's size only. */
  facility: number
}

export type PointFieldMode = 'cluster' | 'spread'

export type PointField = {
  points: FieldPoint[]
  /** Present only when a cluster was found. Normalised to the frame. */
  ring: { x: number; y: number; r: number } | null
}

/**
 * Report positions for the two geographic plates.
 *
 * `cluster` is the Kandy case from the specification: a tight knot of reports
 * inside roughly two kilometres, arriving from several different facilities.
 * `spread` is the Colombo influenza wave: the same number of reports spread
 * evenly across the district with no hotspot at all. The detector treats these
 * differently, and the two plates exist to show why.
 */
export function pointField(seed: number, mode: PointFieldMode, count: number): PointField {
  const rand = mulberry32(seed)
  const points: FieldPoint[] = []

  const centre = { x: 0.38, y: 0.52 }
  const clustered = mode === 'cluster' ? Math.round(count * 0.34) : 0

  for (let i = 0; i < count; i += 1) {
    if (i < clustered) {
      // Polar sampling with a square root on the radius keeps the knot evenly
      // dense rather than piling everything on the centre point.
      const angle = rand() * Math.PI * 2
      const radius = Math.sqrt(rand()) * 0.052
      points.push({
        x: centre.x + Math.cos(angle) * radius * 0.52,
        y: centre.y + Math.sin(angle) * radius,
        facility: Math.floor(rand() * 7),
      })
    } else {
      points.push({
        x: 0.06 + rand() * 0.88,
        y: 0.14 + rand() * 0.74,
        facility: Math.floor(rand() * 12),
      })
    }
  }

  return {
    points,
    ring: mode === 'cluster' ? { x: centre.x, y: centre.y, r: 0.066 } : null,
  }
}
