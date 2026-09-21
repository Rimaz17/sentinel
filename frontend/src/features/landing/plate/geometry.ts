/*
 * Turning series into SVG path data.
 *
 * Kept separate from both the generator and the component so the curve maths
 * can be tested on its own, and so the plate component stays a description of
 * what is drawn rather than of how.
 */

export type Frame = {
  width: number
  height: number
  /** y of the baseline the ridges are measured against. */
  baseline: number
  /** Vertical distance that a normalised value of 1 corresponds to. */
  amplitude: number
}

type Point = { x: number; y: number }

/**
 * Catmull-Rom through the samples, converted to cubic beziers.
 *
 * A polyline reads as a chart; these ridges need to read as terrain, and the
 * smoothing is what separates the two.
 */
function smoothThrough(points: readonly Point[]): string {
  if (points.length === 0) return ''
  const first = points[0]
  if (!first) return ''
  if (points.length < 3) {
    return points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ')
  }

  let d = `M${first.x.toFixed(2)} ${first.y.toFixed(2)}`

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? points[i + 1]
    if (!p0 || !p1 || !p2 || !p3) continue

    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6

    d += ` C${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }

  return d
}

function toPoints(values: readonly number[], frame: Frame, lift: number): Point[] {
  const step = values.length > 1 ? frame.width / (values.length - 1) : frame.width
  return values.map((v, i) => ({
    x: i * step,
    y: frame.baseline - lift - v * frame.amplitude,
  }))
}

/** The ridge's own line, open. */
export function ridgeLine(values: readonly number[], frame: Frame, lift = 0): string {
  return smoothThrough(toPoints(values, frame, lift))
}

/** The ridge closed down to the foot of the frame, for the tonal fill. */
export function ridgeArea(values: readonly number[], frame: Frame, lift = 0): string {
  const line = ridgeLine(values, frame, lift)
  if (!line) return ''
  return `${line} L${frame.width.toFixed(2)} ${frame.height.toFixed(2)} L0 ${frame.height.toFixed(2)} Z`
}
