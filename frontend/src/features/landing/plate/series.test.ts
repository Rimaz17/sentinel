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
  it('is deterministic', () => {
    expect(pointField(3, 'cluster', 60)).toEqual(pointField(3, 'cluster', 60))
  })

  it('draws a ring only when there is a cluster to draw it around', () => {
    expect(pointField(3, 'cluster', 60).ring).not.toBeNull()
    expect(pointField(3, 'spread', 60).ring).toBeNull()
  })

  it('keeps every report inside the frame', () => {
    for (const mode of ['cluster', 'spread'] as const) {
      for (const p of pointField(3, mode, 200).points) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThanOrEqual(1)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeLessThanOrEqual(1)
      }
    }
  })

  it('concentrates reports near the centre on the cluster plate only', () => {
    const near = (mode: 'cluster' | 'spread') =>
      pointField(3, mode, 200).points.filter(
        (p) => Math.hypot((p.x - 0.38) * 0.52, p.y - 0.52) < 0.055,
      ).length

    expect(near('cluster')).toBeGreaterThan(near('spread') * 3)
  })
})
