import { describe, expect, it } from 'vitest'
import { report } from '@/test/fixtures'
import { facilityLabel, reportLabel } from './labels'

describe('map labels', () => {
  it('describes a report dot without anything that identifies a patient', () => {
    expect(reportLabel(report())).toBe('Dengue-like · age 30-39 · LKY0001016 · 28 Sep, 13:10')
  })

  it('describes a facility ring', () => {
    expect(
      facilityLabel({
        code: 'LKY0001016',
        name: 'Kandy',
        districtCode: 'KDY',
        category: 'HOSPITAL',
        institutionType: 'National Hospital',
        latitude: 7.28,
        longitude: 80.63,
      }),
    ).toBe('Kandy · National Hospital · LKY0001016')
  })
})
