import { describe, expect, it } from 'vitest'
import { boundsOf, SRI_LANKA } from './geometry'

describe('boundsOf', () => {
  it('frames the whole island when there is nothing to frame', () => {
    expect(boundsOf([])).toEqual(SRI_LANKA)
    expect(boundsOf([{ latitude: null, longitude: null }])).toEqual(SRI_LANKA)
  })

  it('frames every located point', () => {
    expect(
      boundsOf([
        { latitude: 7.2, longitude: 80.5 },
        { latitude: 7.4, longitude: 80.8 },
        { latitude: null, longitude: null },
        { latitude: 7.3, longitude: 80.6 },
      ]),
    ).toEqual([
      [7.2, 80.5],
      [7.4, 80.8],
    ])
  })

  it('gives a single point a minimum span rather than zooming to one street', () => {
    const [[south, west], [north, east]] = boundsOf([{ latitude: 7.29, longitude: 80.63 }])
    expect(north - south).toBeCloseTo(0.05)
    expect(east - west).toBeCloseTo(0.05)
    expect((north + south) / 2).toBeCloseTo(7.29)
  })
})
