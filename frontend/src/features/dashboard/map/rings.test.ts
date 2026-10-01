import { describe, expect, it } from 'vitest'
import { alert, cluster } from '@/test/fixtures'
import { clusterWords, expectedWords, formatDistance, nearWords, ringLabel, ringsOf } from './rings'

const NONE_HIDDEN = new Set<never>()

describe('ringsOf', () => {
  it('draws each cluster of each open alert', () => {
    const rings = ringsOf(
      [
        alert({ code: 'A-1002', clusters: [cluster(), cluster({ latitude: 7.4 })] }),
        alert({ code: 'A-1001', clusters: [cluster()] }),
      ],
      NONE_HIDDEN,
    )

    expect(rings.map((ring) => ring.key)).toEqual(['A-1002:0', 'A-1002:1', 'A-1001:0'])
    expect(rings[1]?.cluster.latitude).toBe(7.4)
  })

  it('leaves out the rings of an alert that has ended or closed', () => {
    const rings = ringsOf(
      [
        alert({ code: 'A-1002', open: false, clusters: [cluster()] }),
        alert({ code: 'A-1001', open: false, status: 'CLOSED', clusters: [cluster()] }),
      ],
      NONE_HIDDEN,
    )

    expect(rings).toEqual([])
  })

  it('leaves out the rings of a group taken off the map', () => {
    const rings = ringsOf(
      [
        alert({ code: 'A-1002', symptomGroup: 'DENGUE_LIKE', clusters: [cluster()] }),
        alert({ code: 'A-1001', symptomGroup: 'INFLUENZA_LIKE', clusters: [cluster()] }),
      ],
      new Set(['DENGUE_LIKE']),
    )

    expect(rings.map((ring) => ring.alertCode)).toEqual(['A-1001'])
  })
})

describe('cluster words', () => {
  it('says what the ring held and from how many facilities', () => {
    expect(clusterWords(cluster())).toBe('17 reports within 2 km from 7 facilities')
    expect(clusterWords(cluster({ reportCount: 1, facilityCount: 1, radiusMetres: 800 }))).toBe(
      '1 report within 800 m from 1 facility',
    )
  })

  it('gives a distance in kilometres from one kilometre up', () => {
    expect(formatDistance(2000)).toBe('2 km')
    expect(formatDistance(1500)).toBe('1.5 km')
    expect(formatDistance(999)).toBe('999 m')
  })

  it('names the nearest facility where there is one', () => {
    expect(nearWords(cluster())).toBe('near Peradeniya')
    expect(nearWords(cluster({ nearestFacilityCode: null, nearestFacilityName: null }))).toBeNull()
  })

  it('says what the ring would usually have held', () => {
    expect(expectedWords(cluster())).toBe('3.3 expected at its usual share')
  })

  it('labels a ring with its alert, group, cluster and place', () => {
    const [ring] = ringsOf([alert({ clusters: [cluster()] })], NONE_HIDDEN)

    expect(ring && ringLabel(ring)).toBe(
      'A-1001 · Dengue-like · 17 reports within 2 km from 7 facilities, near Peradeniya',
    )
  })
})
