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

  it('states the coverage, window and threshold in the hero strip', () => {
    renderLanding()
    expect(screen.getByText('25 districts · 1,505 facilities')).toBeInTheDocument()
    expect(screen.getByText('last 7 days against 8 weeks')).toBeInTheDocument()
    expect(screen.getByText('3σ')).toBeInTheDocument()
  })

  it('puts every two-column section on the one shared grid', () => {
    const { container } = renderLanding()
    // Sections inventing their own column ratios is what made the page read as
    // unaligned, so there must be no stray grid definitions left behind.
    expect(container.querySelectorAll('.split').length).toBe(4)
  })

  it('carries no plate switcher', () => {
    renderLanding()
    // Figures are fine — the switcher is the thing that must not come back.
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('carries three figures', () => {
    renderLanding()
    expect(screen.getAllByRole('img')).toHaveLength(3)
  })

  it('gives every image alt text that carries its information', () => {
    renderLanding()
    for (const img of screen.getAllByRole('img')) {
      const alt = img.getAttribute('alt') ?? ''
      // Not empty, and not a filename or a shrug.
      expect(alt.length).toBeGreaterThan(30)
      expect(alt).not.toMatch(/\.(webp|jpe?g|png)$/i)
      expect(alt).not.toMatch(/^(image|figure|photo|illustration)$/i)
    }
  })

  it('labels every figure as an illustration rather than as system output', () => {
    renderLanding()
    // None of these pictures is a rendering of real or simulated output, and
    // the page must not let a visitor think otherwise.
    const captions = screen
      .getAllByRole('figure')
      .map((f) => f.querySelector('figcaption')?.textContent ?? '')
    expect(captions).toHaveLength(3)
    for (const caption of captions) {
      expect(caption.toLowerCase()).toContain('illustration')
    }
  })

  it('loads only the figure at the fold eagerly', () => {
    renderLanding()
    const loading = screen.getAllByRole('img').map((i) => i.getAttribute('loading'))
    expect(loading.filter((l) => l === 'eager')).toHaveLength(1)
    expect(loading.filter((l) => l === 'lazy')).toHaveLength(2)
  })

  it('reserves space for every image so nothing shifts as they load', () => {
    renderLanding()
    for (const img of screen.getAllByRole('img')) {
      expect(img).toHaveAttribute('width')
      expect(img).toHaveAttribute('height')
      expect(img).toHaveAttribute('srcset')
      expect(img).toHaveAttribute('sizes')
    }
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
