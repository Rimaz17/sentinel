import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { alert, DISTRICTS, report, weeklyCounts } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import type { LocatedReport } from './api/types'
import { DashboardPage } from './DashboardPage'

// Leaflet draws to a canvas jsdom does not have; the map's own module is
// tested apart, and here it only reports what it was given.
vi.mock('./map/ReportMap', () => ({
  ReportMap: ({ reports }: { reports: LocatedReport[] }) => (
    <p data-testid="map">{reports.length} dots on the map</p>
  ),
}))

let fetchMock: Mock<(url: string) => Promise<Response>>

function respond(url: string): Response {
  const { pathname, searchParams } = new URL(url, 'http://localhost')
  const district = searchParams.get('district')
  switch (pathname) {
    case '/api/districts':
      return Response.json(DISTRICTS)
    case '/api/alerts':
      return Response.json(district === 'NEL' ? [] : [alert()])
    case '/api/reports/locations':
      return Response.json([
        report({ id: '1' }),
        report({ id: '2' }),
        report({ id: '3', symptomGroup: 'INFLUENZA_LIKE' }),
      ])
    case '/api/reports/weekly-counts':
      return Response.json(weeklyCounts(district))
    case '/api/facilities':
      return Response.json([])
    default:
      return Response.json({ detail: 'Not found.' }, { status: 404 })
  }
}

beforeEach(() => {
  fetchMock = vi.fn((url: string) => Promise.resolve(respond(url)))
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
          <Route path="/app" element={<DashboardPage />} />
          <Route path="/app/districts/:code" element={<DashboardPage />} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  )
}

function requested(path: string) {
  return fetchMock.mock.calls.map(([url]) => url).filter((url) => url.startsWith(path))
}

describe('DashboardPage', () => {
  it('shows the whole country at /app', async () => {
    renderAt('/app')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'All of Sri Lanka' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('292 reports in the last 7 days · 1 open alert')).toBeVisible()
    expect(await screen.findByRole('article', { name: 'A-1001' })).toBeInTheDocument()
    expect(requested('/api/alerts')).toContain('/api/alerts?limit=50')
    expect(requested('/api/facilities')).toEqual([])
  })

  it('carries all four parts of the dashboard', async () => {
    renderAt('/app')

    expect(await screen.findByRole('navigation', { name: 'Districts' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Alerts' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Reports on the map' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Weekly reports' })).toBeInTheDocument()
    expect(await screen.findByTestId('map')).toHaveTextContent('3 dots on the map')
    expect(
      await screen.findAllByRole('img', { name: /reports per week, all of sri lanka/i }),
    ).toHaveLength(4)
  })

  it('asks for one district everywhere at /app/districts/:code', async () => {
    renderAt('/app/districts/KDY')

    expect(await screen.findByRole('heading', { level: 1, name: 'Kandy' })).toBeInTheDocument()
    expect(screen.getByText('Central Province · KDY')).toBeInTheDocument()
    await screen.findByRole('article', { name: 'A-1001' })
    expect(requested('/api/alerts')).toEqual(['/api/alerts?district=KDY&limit=50'])
    expect(requested('/api/reports/locations')).toEqual([
      '/api/reports/locations?district=KDY&days=7',
    ])
    expect(requested('/api/reports/weekly-counts')).toEqual([
      '/api/reports/weekly-counts?district=KDY',
    ])
    expect(requested('/api/facilities')).toEqual(['/api/facilities?district=KDY'])
  })

  it('marks the district in view in the navigation', async () => {
    renderAt('/app/districts/KDY')

    const nav = await screen.findByRole('navigation', { name: 'Districts' })
    expect(await within(nav).findByRole('link', { name: /^kandy/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('names the page after the area in view', async () => {
    renderAt('/app/districts/KDY')

    await screen.findByRole('heading', { level: 1, name: 'Kandy' })
    expect(document.title).toBe('Kandy · Internal dashboard · Sentinel')
  })

  it('says so when a district has no alerts', async () => {
    renderAt('/app/districts/NEL')

    expect(await screen.findByText('No alerts for Nuwara Eliya.')).toBeInTheDocument()
  })

  it('says so when no district has the code in the address', async () => {
    renderAt('/app/districts/XYZ')

    expect(await screen.findByText('No district has the code XYZ.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to all of Sri Lanka' })).toHaveAttribute(
      'href',
      '/app',
    )
  })

  it('takes a symptom group off the map and puts it back', async () => {
    renderAt('/app')

    const map = await screen.findByTestId('map')
    await screen.findByText('3 dots on the map')

    await userEvent.click(await screen.findByRole('checkbox', { name: /dengue-like/i }))
    expect(map).toHaveTextContent('1 dots on the map')

    await userEvent.click(screen.getByRole('checkbox', { name: /dengue-like/i }))
    expect(map).toHaveTextContent('3 dots on the map')
  })

  it('explains in each panel when the API cannot be reached', async () => {
    fetchMock.mockImplementation(() => Promise.reject(new TypeError('Failed to fetch')))
    renderAt('/app')

    const failures = await screen.findAllByRole('alert')
    expect(failures.map((failure) => failure.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Could not load districts.'),
        expect.stringContaining('Could not load alerts.'),
        expect.stringContaining('Could not load report positions.'),
        expect.stringContaining('Could not load weekly counts.'),
      ]),
    )
    expect(failures[0]).toHaveTextContent('The API could not be reached. Check that it is running.')
  })
})
