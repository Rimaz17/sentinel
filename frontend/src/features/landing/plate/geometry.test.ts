import { describe, expect, it } from 'vitest'
import { ridgeArea, ridgeLine, type Frame } from './geometry'

const frame: Frame = { width: 1200, height: 520, baseline: 400, amplitude: 260 }

describe('ridgeLine', () => {
  it('returns nothing for an empty series', () => {
    expect(ridgeLine([], frame)).toBe('')
  })

  it('starts at the left edge of the frame', () => {
    expect(ridgeLine([0.2, 0.4, 0.6, 0.3], frame)).toMatch(/^M0\.00 /)
  })

  it('emits curves rather than a polyline once there are enough samples', () => {
    const d = ridgeLine([0.2, 0.4, 0.6, 0.3], frame)
    expect(d).toContain('C')
    expect(d).not.toContain('L')
  })

  it('falls back to straight segments below three samples', () => {
    expect(ridgeLine([0.2, 0.4], frame)).toContain('L')
  })

  it('maps a higher value to a higher point on the plate', () => {
    const low = ridgeLine([0.1, 0.1, 0.1, 0.1], frame)
    const high = ridgeLine([0.9, 0.9, 0.9, 0.9], frame)
    const firstY = (d: string) => Number(/^M[\d.]+ ([\d.]+)/.exec(d)?.[1])
    expect(firstY(high)).toBeLessThan(firstY(low))
  })

  it('lifts the whole ridge by the lift argument', () => {
    const firstY = (d: string) => Number(/^M[\d.]+ ([\d.-]+)/.exec(d)?.[1])
    expect(firstY(ridgeLine([0.5, 0.5, 0.5], frame, 40))).toBeCloseTo(
      firstY(ridgeLine([0.5, 0.5, 0.5], frame)) - 40,
      2,
    )
  })

  it('produces no NaN for any well-formed series', () => {
    expect(ridgeLine([0, 1, 0.5, 0.25, 0.75], frame)).not.toContain('NaN')
  })
})

describe('ridgeArea', () => {
  it('closes the ridge down to the foot of the frame', () => {
    const d = ridgeArea([0.2, 0.4, 0.6, 0.3], frame)
    expect(
      d.endsWith(
        `L${frame.width.toFixed(2)} ${frame.height.toFixed(2)} L0 ${frame.height.toFixed(2)} Z`,
      ),
    ).toBe(true)
  })

  it('returns nothing for an empty series', () => {
    expect(ridgeArea([], frame)).toBe('')
  })
})
