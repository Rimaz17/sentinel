import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { report } from '@/test/fixtures'
import type { Facility } from '../api/types'
import { MAP_LIMIT } from './counts'
import { MapKey } from './MapKey'

const REPORTS = [
  report({ id: '1' }),
  report({ id: '2' }),
  report({ id: '3', symptomGroup: 'INFLUENZA_LIKE' }),
]

function facility(code: string, located: boolean): Facility {
  return {
    code,
    name: code,
    districtCode: 'KDY',
    category: 'HOSPITAL',
    institutionType: 'Divisional Hospital',
    latitude: located ? 7.29 : null,
    longitude: located ? 80.63 : null,
  }
}

describe('MapKey', () => {
  it('states in words what the dots show', () => {
    render(<MapKey reports={REPORTS} reportsInArea={3} facilities={[]} areaName="Kandy" />)

    expect(screen.getByText(/with a location from the last 7 days, Kandy\./)).toHaveTextContent(
      '3 reports with a location from the last 7 days, Kandy.',
    )
    const key = screen.getByRole('list', { name: 'Map key' })
    expect(key).toHaveTextContent('Dengue-like2')
    expect(key).toHaveTextContent('Influenza-like1')
    expect(key).toHaveTextContent('Leptospirosis-like0')
  })

  it('says how many reports have no location and are not drawn', () => {
    render(<MapKey reports={REPORTS} reportsInArea={5} facilities={[]} areaName="Kandy" />)

    expect(screen.getByText(/2 more have no location and are not drawn/)).toBeInTheDocument()
  })

  it('says when only the newest reports are drawn', () => {
    const many = Array.from({ length: MAP_LIMIT }, (_, index) => report({ id: String(index) }))
    render(<MapKey reports={many} reportsInArea={6000} facilities={[]} areaName="Sri Lanka" />)

    expect(screen.getByText(/only the newest 5,000 are drawn/i)).toBeInTheDocument()
  })

  it('keys the facility rings, with how many could be placed', () => {
    render(
      <MapKey
        reports={REPORTS}
        reportsInArea={3}
        facilities={[facility('A', true), facility('B', false), facility('C', true)]}
        areaName="Kandy"
      />,
    )

    expect(screen.getByRole('list', { name: 'Map key' })).toHaveTextContent(
      'Facility2 of 3 located',
    )
  })

  it('leaves facilities out of the key on the national view', () => {
    render(<MapKey reports={REPORTS} reportsInArea={3} facilities={[]} areaName="Sri Lanka" />)

    expect(screen.getByRole('list', { name: 'Map key' })).not.toHaveTextContent('Facility')
  })
})
