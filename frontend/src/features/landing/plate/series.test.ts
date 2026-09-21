import { describe, expect, it } from 'vitest'
import { mulberry32, pointField, ridgeField } from './series'

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('produces a different sequence for a different seed', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })

  it('stays within the unit interval', () => {
    const rand = mulberry32(7)
    for (let i = 0; i < 500; i += 1) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('ridgeField', () => {
  it('is deterministic, so the plate is identical on every render', () => {
    expect(ridgeField(11, 25, 48, 'signal')).toEqual(ridgeField(11, 25, 48, 'signal'))
  })

  it('returns one ridge per district, ordered back to front', () => {
    const field = ridgeField(11, 25, 48, 'baseline')
    expect(field).toHaveLength(25)
    expect(field[0]?.depth).toBe(0)
    expect(field[24]?.depth).toBe(1)
  })

  it('leaves every district inside its range on the baseline plate', () => {
    const field = ridgeField(11, 25, 48, 'baseline')
    expect(field.some((r) => r.exceeding)).toBe(false)
  })

  it('pushes exactly one district out of range on the signal plate', () => {
    const field = ridgeField(11, 25, 48, 'signal')
    expect(field.filter((r) => r.exceeding)).toHaveLength(1)
  })

  it('raises the exceeding district above every other district', () => {
    const field = ridgeField(11, 25, 48, 'signal')
    const exceeding = field.find((r) => r.exceeding)
    const peak = Math.max(...(exceeding?.values ?? []))
    const others = field.filter((r) => !r.exceeding).flatMap((r) => r.values)
    expect(peak).toBeGreaterThan(Math.max(...others))
  })

  it('changes only the one district between the baseline and signal plates', () => {
    const calm = ridgeField(11, 25, 48, 'baseline')
    const signal = ridgeField(11, 25, 48, 'signal')
    const differing = calm.filter(
      (r, i) => JSON.stringify(r.values) !== JSON.stringify(signal[i]?.values),
    )
    expect(differing).toHaveLength(1)
  })
})

describe('pointField', () => {
  const ASPECT = 1440 / 430

  it('is deterministic', () => {
    expect(pointField(3, 'cluster', 60, ASPECT)).toEqual(pointField(3, 'cluster', 60, ASPECT))
  })

  it('draws a ring only when there is a cluster to draw it around', () => {
    expect(pointField(3, 'cluster', 60, ASPECT).ring).not.toBeNull()
    expect(pointField(3, 'spread', 60, ASPECT).ring).toBeNull()
  })

  it('keeps every report inside the frame', () => {
    for (const mode of ['cluster', 'spread'] as const) {
      for (const p of pointField(3, mode, 200, ASPECT).points) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThanOrEqual(1)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeLessThanOrEqual(1)
      }
    }
  })

  it('concentrates reports near the centre on the cluster plate only', () => {
    const near = (mode: 'cluster' | 'spread') =>
      pointField(3, mode, 200, ASPECT).points.filter(
        (p) => Math.hypot((p.x - 0.38) * ASPECT, p.y - 0.52) < 0.135,
      ).length

    expect(near('cluster')).toBeGreaterThan(near('spread') * 3)
  })

  it('keeps every clustered report inside the ring it is drawn in', () => {
    const field = pointField(3, 'cluster', 200, ASPECT)
    const ring = field.ring
    expect(ring).not.toBeNull()
    if (!ring) return

    // A third of the reports are the cluster; all of those must sit inside the
    // ring once the frame's aspect is accounted for.
    const inside = field.points.filter(
      (p) => Math.hypot((p.x - ring.x) * ASPECT, p.y - ring.y) <= ring.r,
    ).length

    expect(inside).toBeGreaterThanOrEqual(Math.round(200 * 0.34))
  })
})
