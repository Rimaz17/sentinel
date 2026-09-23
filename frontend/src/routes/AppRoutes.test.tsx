import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './AppRoutes'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
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

  it.each([
    ['/dashboard', /the public dashboard/i],
    ['/signin', /sign in/i],
    ['/register', /facility registration/i],
    ['/submit', /submit a report/i],
    ['/app', /the internal dashboard/i],
    ['/app/alerts/1001', /the internal dashboard/i],
  ])('renders a planned page at %s', (path, heading) => {
    renderAt(path)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('marks every unbuilt route as not built yet rather than faking a product', () => {
    for (const path of ['/dashboard', '/signin', '/register', '/submit', '/app']) {
      const { unmount } = renderAt(path)
      expect(screen.getByText(/not built yet/i)).toBeInTheDocument()
      unmount()
    }
  })

  it('tells an inspector without an account to contact an administrator', () => {
    renderAt('/signin')
    expect(screen.getByText(/contact their district administrator/i)).toBeInTheDocument()
  })

  it('offers no registration link on the sign-in page', () => {
    renderAt('/signin')
    // PHI accounts are admin-provisioned, so sign-in must not hand anyone a
    // registration route they cannot use.
    expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument()
  })

  it('falls through to a not-found page for an unknown route', () => {
    renderAt('/nope/not-a-route')
    expect(
      screen.getByRole('heading', { level: 1, name: /that page does not exist/i }),
    ).toBeInTheDocument()
  })

  it('gives every planned page a way back to the front page', () => {
    renderAt('/dashboard')
    expect(screen.getByRole('link', { name: /back to the front page/i })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
