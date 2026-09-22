import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './LandingPage'

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

describe('LandingPage', () => {
  it('says what Sentinel is in its heading', () => {
    renderLanding()
    expect(
      screen.getByRole('heading', { level: 1, name: /early warning for the outbreak/i }),
    ).toBeInTheDocument()
  })

  it('offers the public dashboard as the primary route', () => {
    renderLanding()
    const links = screen.getAllByRole('link', { name: /public dashboard/i })
    expect(links.length).toBeGreaterThan(0)
    expect(links[0]).toHaveAttribute('href', '/dashboard')
  })

  it('states that the data is simulated where a visitor will read it', () => {
    renderLanding()
    expect(screen.getByText(/all case data simulated/i)).toBeInTheDocument()
  })

  it('provides a skip link to the main content', () => {
    renderLanding()
    expect(screen.getByRole('link', { name: /skip to content/i })).toHaveAttribute('href', '#main')
  })

  it('states the detection window and threshold in the hero rail', () => {
    renderLanding()
    expect(screen.getByText('25 districts · 1,505 facilities')).toBeInTheDocument()
    expect(screen.getByText('last 7 days against 8 weeks')).toBeInTheDocument()
    expect(screen.getByText('3σ')).toBeInTheDocument()
  })

  it('carries no plate figure or plate switcher', () => {
    renderLanding()
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByRole('figure')).not.toBeInTheDocument()
  })

  it('carries no author byline', () => {
    renderLanding()
    expect(screen.queryByText(/rimaz|saththar|iit sri lanka/i)).not.toBeInTheDocument()
  })
})

describe('LandingPage — access routes', () => {
  it('offers registration only to data providers, never to inspectors', () => {
    renderLanding()

    const register = screen.getAllByRole('link', { name: /invite code/i })
    expect(register.length).toBe(1)
    expect(register[0]).toHaveAttribute('href', '/register')
  })

  it('tells an inspector without an account to contact an administrator', () => {
    renderLanding()
    expect(screen.getByText(/created by a system administrator/i)).toBeInTheDocument()
  })

  it('never links an inspector to a registration route', () => {
    renderLanding()

    // The negative case. A "Register" affordance anywhere in the inspector's
    // row would be a dead end: PHI accounts are admin-provisioned.
    const inspectorRow = screen
      .getByText('Public health inspector', { selector: '.entries__staff-role' })
      .closest('li')
    expect(inspectorRow).not.toBeNull()
    const links = within(inspectorRow as HTMLElement).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/signin'])
  })

  it('keeps no case numbers, alert counts or district status on the page', () => {
    renderLanding()

    // Those belong on the public dashboard behind a deliberate click, not on a
    // page search engines index.
    expect(screen.queryByText(/active alerts?/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/districts? (?:at|on) (?:watch|alert)/i)).not.toBeInTheDocument()
  })
})
