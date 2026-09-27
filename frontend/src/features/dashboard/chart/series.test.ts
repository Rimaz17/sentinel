import { describe, expect, it } from 'vitest'
import { weeklyCounts } from '@/test/fixtures'
import { scaleMax, seriesFor } from './series'

describe('seriesFor', () => {
  it("takes one group's nine weeks, oldest first", () => {
    expect(seriesFor(weeklyCounts(), 'DENGUE_LIKE').counts).toEqual([
      22, 27, 25, 24, 28, 23, 26, 25, 41,
    ])
  })

  it('separates the current week from the average of the eight before it', () => {
    const series = seriesFor(weeklyCounts(), 'DENGUE_LIKE')
    expect(series.current).toBe(41)
    expect(series.average).toBe(25)
  })

  it('averages a quiet group to zero', () => {
    expect(seriesFor(weeklyCounts(), 'LEPTOSPIROSIS_LIKE')).toMatchObject({
      current: 0,
      average: 0,
    })
  })
})

describe('scaleMax', () => {
  it('leaves headroom above the tallest week', () => {
    expect(scaleMax(seriesFor(weeklyCounts(), 'DENGUE_LIKE'))).toBeCloseTo(41 * 1.15)
  })

  it('never scales to zero, so a quiet group still draws', () => {
    expect(scaleMax(seriesFor(weeklyCounts(), 'LEPTOSPIROSIS_LIKE'))).toBeGreaterThan(0)
  })
})
