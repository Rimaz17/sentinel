import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSession } from '@/lib/api/session'
import { DISTRICTS, inspectorSession, weeklyCounts } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import { AppRoutes } from './AppRoutes'

// The maps need a canvas and layout jsdom does not have.
vi.mock('@/features/dashboard/map/ReportMap', () => ({ ReportMap: () => null }))
vi.mock('@/features/public/map/DistrictMap', () => ({ DistrictMap: () => null }))

function requestedUrls(): string[] {
  return vi.mocked(fetch).mock.calls.map(([url]) => url as string)
}

beforeEach(() => {
  resetSession()
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve(
        Response.json(
          url === '/api/auth/refresh'
            ? inspectorSession()
            : url.startsWith('/api/public/trends')
              ? weeklyCounts(null)
              : url.startsWith('/api/districts')
                ? DISTRICTS
                : url.startsWith('/api/reports/weekly-counts')
                  ? weeklyCounts()
                  : [],
        ),
      ),
    ),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryWrapper>
        <AppRoutes />
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('AppRoutes', () => {
  it('renders the landing page at the root', () => {
    renderAt('/')
    expect(
      screen.getByRole('heading', { level: 1, name: /find it on day three/i }),
    ).toBeInTheDocument()
  })

  it('renders the public dashboard at /dashboard, without signing in', async () => {
    resetSession()
    renderAt('/dashboard')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sri Lanka, district by district' }),
    ).toBeInTheDocument()
    expect(requestedUrls()).not.toContain('/api/auth/refresh')
  })

  it('tells an inspector without an account to contact an administrator', async () => {
    renderAt('/signin')
    expect(await screen.findByText(/contact their district administrator/i)).toBeInTheDocument()
  })

  it('offers no registration link on the sign-in page', async () => {
    renderAt('/signin')
    await screen.findByRole('heading', { level: 1, name: 'Staff sign-in' })
    // PHI accounts are admin-provisioned, so sign-in must not hand anyone a
    // registration route they cannot use.
    expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument()
  })

  it('renders the internal dashboard at /app', async () => {
    renderAt('/app')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'All of Sri Lanka' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/not built yet/i)).not.toBeInTheDocument()
  })

  it('renders one district of the dashboard at /app/districts/:code', async () => {
    renderAt('/app/districts/KDY')
    expect(await screen.findByRole('heading', { level: 1, name: 'Kandy' })).toBeInTheDocument()
  })

  it('falls through to a not-found page for an unknown address under /app', () => {
    renderAt('/app/alerts/1001')
    expect(
      screen.getByRole('heading', { level: 1, name: /that page does not exist/i }),
    ).toBeInTheDocument()
  })

  it('falls through to a not-found page for an unknown route', () => {
    renderAt('/nope/not-a-route')
    expect(
      screen.getByRole('heading', { level: 1, name: /that page does not exist/i }),
    ).toBeInTheDocument()
  })

  it('gives an unknown address a way back to the front page', () => {
    renderAt('/nope/not-a-route')
    expect(screen.getByRole('link', { name: /back to the front page/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('keeps administration from an inspector', async () => {
    renderAt('/app/admin/facilities')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'This page is not for your account.' }),
    ).toBeInTheDocument()
  })
})
