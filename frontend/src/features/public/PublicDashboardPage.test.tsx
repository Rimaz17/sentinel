import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { weeklyCounts } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import type { PublicAlert, PublicDistrict } from './api'
import { PublicDashboardPage } from './PublicDashboardPage'

// Leaflet needs layout jsdom does not have; the page's text alternatives are what is tested here.
vi.mock('./map/DistrictMap', () => ({
  DistrictMap: ({ districts }: { districts: PublicDistrict[] }) => (
    <p data-testid="map">{districts.length} districts on the map</p>
  ),
}))

function district(overrides: Partial<PublicDistrict> = {}): PublicDistrict {
  return {
    code: 'CMB',
    name: 'Colombo',
    province: 'Western',
    status: 'USUAL',
    elevatedGroups: [],
    reportsLast7Days: 212,
    ...overrides,
  }
}

const DISTRICTS = [
  district({ code: 'AMP', name: 'Ampara', province: 'Eastern', reportsLast7Days: 30 }),
  district(),
  district({
    code: 'KDY',
    name: 'Kandy',
    province: 'Central',
    status: 'ELEVATED',
    elevatedGroups: ['DENGUE_LIKE'],
    reportsLast7Days: 41,
  }),
]

const ACTIVE: PublicAlert = {
  districtCode: 'KDY',
  districtName: 'Kandy',
  symptomGroup: 'DENGUE_LIKE',
  active: true,
  since: '2026-09-25',
  lastElevated: '2026-09-28',
  basis: 'CONFIRMED',
  headline: 'Kandy district: elevated dengue-like illness activity. Follow standard precautions.',
}

const ENDED: PublicAlert = {
  ...ACTIVE,
  districtCode: 'GAL',
  districtName: 'Galle',
  active: false,
  since: '2026-08-01',
  lastElevated: '2026-08-09',
  basis: 'THRESHOLD',
  headline: 'Galle district: dengue-like illness activity is no longer elevated.',
}

let fetchMock: Mock<(url: string) => Promise<Response>>
let alerts: PublicAlert[]

beforeEach(() => {
  alerts = [ACTIVE, ENDED]
  fetchMock = vi.fn((url: string) => {
    const { pathname, searchParams } = new URL(url, 'http://localhost')
    switch (pathname) {
      case '/api/public/districts':
        return Promise.resolve(Response.json(DISTRICTS))
      case '/api/public/alerts':
        return Promise.resolve(Response.json(alerts))
      case '/api/public/trends':
        return Promise.resolve(Response.json(weeklyCounts(searchParams.get('district'))))
      default:
        return Promise.resolve(Response.json({ detail: 'Not found.' }, { status: 404 }))
    }
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryWrapper>
        <Routes>
          <Route path="/dashboard" element={<PublicDashboardPage />} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  )
}

function requested(): string[] {
  return fetchMock.mock.calls.map(([url]) => url)
}

describe('PublicDashboardPage', () => {
  it('says how many districts have elevated activity', async () => {
    renderAt('/dashboard')

    expect(await screen.findByText('1 of 25 districts has elevated activity.')).toBeInTheDocument()
  })

  it('shows an active alert in plain words, with who confirmed it', async () => {
    renderAt('/dashboard')

    const alertsRegion = screen.getByRole('region', { name: 'Alerts' })
    expect(await within(alertsRegion).findByText(ACTIVE.headline)).toBeInTheDocument()
    expect(
      within(alertsRegion).getByText(/confirmed by a public health inspector/i),
    ).toBeInTheDocument()
    expect(within(alertsRegion).getByText('Active')).toBeInTheDocument()
  })

  it('keeps ended alerts apart, as history', async () => {
    renderAt('/dashboard')

    expect(await screen.findByText(/ended in the last 90 days · 1/i)).toBeInTheDocument()
    expect(screen.getByText(ENDED.headline)).not.toBeVisible()
  })

  it('says plainly when there is no active alert', async () => {
    alerts = []
    renderAt('/dashboard')

    expect(await screen.findByText('No district has an active alert.')).toBeInTheDocument()
  })

  it('states every district’s status in words, elevated first', async () => {
    renderAt('/dashboard')

    const table = await screen.findByRole('table', { name: /status of each district/i })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Kandy')
    expect(rows[0]).toHaveTextContent('Elevated: Dengue-like')
    expect(rows[1]).toHaveTextContent('Usual')
  })

  it('charts the country, or one district when chosen', async () => {
    renderAt('/dashboard?district=kdy')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Weekly reports, Kandy' }),
    ).toBeInTheDocument()
    expect(requested()).toContain('/api/public/trends?district=KDY')
    expect(screen.getByRole('link', { name: 'Back to all of Sri Lanka' })).toHaveAttribute(
      'href',
      '/dashboard',
    )
  })

  it('ignores a district code that names no district', async () => {
    renderAt('/dashboard?district=XYZ')

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Weekly reports, all of Sri Lanka' }),
    ).toBeInTheDocument()
    expect(requested().join(' ')).not.toContain('XYZ')
  })

  it('asks only the public api, and never signs in', async () => {
    renderAt('/dashboard')
    await screen.findByText(ACTIVE.headline)

    expect(requested().every((url) => url.startsWith('/api/public/'))).toBe(true)
  })

  it('states that the data is simulated', () => {
    renderAt('/dashboard')

    expect(screen.getByText(/all case data simulated/i)).toBeInTheDocument()
  })

  it('uses no em dashes', async () => {
    const { container } = renderAt('/dashboard')
    await screen.findByText(ACTIVE.headline)

    expect(container.textContent ?? '').not.toContain('—')
  })
})
