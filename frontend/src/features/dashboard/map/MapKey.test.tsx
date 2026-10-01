import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { alert, cluster, report } from '@/test/fixtures'
import type { Facility, SymptomGroup } from '../api/types'
import { MAP_LIMIT } from './counts'
import { MapKey } from './MapKey'
import { ringsOf } from './rings'

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

const ALL_SHOWN: ReadonlySet<SymptomGroup> = new Set()
const toggles = { hidden: ALL_SHOWN, onToggle: () => {}, rings: [] }

describe('MapKey', () => {
  it('states in words what the dots show', () => {
    render(
      <MapKey reports={REPORTS} reportsInArea={3} facilities={[]} areaName="Kandy" {...toggles} />,
    )

    expect(screen.getByText(/with a location from the last 7 days, Kandy\./)).toHaveTextContent(
      '3 reports with a location from the last 7 days, Kandy.',
    )
    const key = screen.getByRole('group', { name: 'Show on the map' })
    expect(key).toHaveTextContent('Dengue-like2')
    expect(key).toHaveTextContent('Influenza-like1')
    expect(key).toHaveTextContent('Leptospirosis-like0')
  })

  it('says how many reports have no location and are not drawn', () => {
    render(
      <MapKey reports={REPORTS} reportsInArea={5} facilities={[]} areaName="Kandy" {...toggles} />,
    )

    expect(screen.getByText(/2 more have no location and are not drawn/)).toBeInTheDocument()
  })

  it('says when only the newest reports are drawn', () => {
    const many = Array.from({ length: MAP_LIMIT }, (_, index) => report({ id: String(index) }))
    render(
      <MapKey
        reports={many}
        reportsInArea={6000}
        facilities={[]}
        areaName="Sri Lanka"
        {...toggles}
      />,
    )

    expect(screen.getByText(/only the newest 5,000 are drawn/i)).toBeInTheDocument()
  })

  it('keys the facility rings, with how many could be placed', () => {
    render(
      <MapKey
        reports={REPORTS}
        reportsInArea={3}
        facilities={[facility('A', true), facility('B', false), facility('C', true)]}
        areaName="Kandy"
        {...toggles}
      />,
    )

    expect(screen.getByRole('group', { name: 'Show on the map' })).toHaveTextContent(
      'Facility2 of 3 located',
    )
  })

  it('leaves facilities out of the key on the national view', () => {
    render(
      <MapKey
        reports={REPORTS}
        reportsInArea={3}
        facilities={[]}
        areaName="Sri Lanka"
        {...toggles}
      />,
    )

    expect(screen.getByRole('group', { name: 'Show on the map' })).not.toHaveTextContent('Facility')
  })

  it('lets each group be taken off the map and put back', async () => {
    const onToggle = vi.fn()
    render(
      <MapKey
        reports={REPORTS}
        reportsInArea={3}
        facilities={[]}
        areaName="Kandy"
        hidden={new Set<SymptomGroup>(['INFLUENZA_LIKE'])}
        onToggle={onToggle}
        rings={[]}
      />,
    )

    expect(screen.getByRole('checkbox', { name: /dengue-like/i })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /influenza-like/i })).not.toBeChecked()

    await userEvent.click(screen.getByRole('checkbox', { name: /gastrointestinal/i }))
    expect(onToggle).toHaveBeenCalledWith('GASTROINTESTINAL')
  })

  it('lists each cluster ring in words, so the rings never rely on colour or sight', () => {
    const rings = ringsOf(
      [
        alert({ code: 'A-1002', clusters: [cluster()] }),
        alert({
          code: 'A-1001',
          symptomGroup: 'INFLUENZA_LIKE',
          clusters: [
            cluster({
              reportCount: 9,
              facilityCount: 3,
              expectedCount: 1.2,
              nearestFacilityName: null,
            }),
          ],
        }),
      ],
      ALL_SHOWN,
    )
    render(
      <MapKey
        reports={REPORTS}
        reportsInArea={3}
        facilities={[]}
        areaName="Kandy"
        {...toggles}
        rings={rings}
      />,
    )

    expect(screen.getByText('Cluster rings')).toHaveTextContent('Cluster rings2')
    const items = screen.getAllByRole('listitem')
    expect(items.map((item) => item.textContent)).toEqual([
      'A-1002 · Dengue-like · 17 reports within 2 km from 7 facilities, near Peradeniya; 3.3 expected at its usual share',
      'A-1001 · Influenza-like · 9 reports within 2 km from 3 facilities; 1.2 expected at its usual share',
    ])
  })

  it('says nothing of rings when none is drawn', () => {
    render(
      <MapKey reports={REPORTS} reportsInArea={3} facilities={[]} areaName="Kandy" {...toggles} />,
    )

    expect(screen.queryByText(/cluster ring/i)).not.toBeInTheDocument()
  })
})
