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
      screen.getByRole('heading', { level: 1, name: /find it on day three/i }),
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
    // Figures are fine; the switcher is the thing that must not come back.
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('carries a figure in each of the four content sections', () => {
    renderLanding()
    expect(screen.getAllByRole('img')).toHaveLength(4)
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

  it('names every figure an illustration in its alt text', () => {
    renderLanding()
    // The figures carry no visible caption, so the alt text is where a reader
    // who cannot see the drawing learns it is not system output.
    const alts = screen.getAllByRole('img').map((i) => i.getAttribute('alt') ?? '')
    expect(alts).toHaveLength(4)
    for (const alt of alts) {
      expect(alt.toLowerCase()).toContain('illustration')
    }
  })

  it('carries no visible figure captions', () => {
    const { container } = renderLanding()
    expect(container.querySelectorAll('figcaption')).toHaveLength(0)
  })

  it('still states plainly that the data is simulated', () => {
    renderLanding()
    // With the captions gone this notice is the page's visible disclosure, so
    // it must not quietly disappear too.
    expect(screen.getByText(/all case data simulated/i)).toBeInTheDocument()
  })

  it('loads only the figure at the fold eagerly', () => {
    renderLanding()
    const loading = screen.getAllByRole('img').map((i) => i.getAttribute('loading'))
    expect(loading.filter((l) => l === 'eager')).toHaveLength(1)
    expect(loading.filter((l) => l === 'lazy')).toHaveLength(3)
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

describe('LandingPage: access routes', () => {
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
      .getByText('Public health inspector', { selector: 'li > p' })
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

describe('LandingPage: house style', () => {
  it('uses no em dashes anywhere in the rendered page', () => {
    const { container } = renderLanding()
    // CLAUDE.md section 11: never an em dash, in copy or anywhere else.
    expect(container.textContent ?? '').not.toContain('\u2014')
  })

  it('keeps the restraint statement with the privacy section', () => {
    renderLanding()
    const privacy = screen
      .getByRole('heading', { name: /identity is stripped/i })
      .closest('section')
    expect(privacy).not.toBeNull()
    expect(privacy?.textContent).toMatch(/does not diagnose anyone/i)
    expect(privacy?.textContent).toMatch(/can mark it a false alarm/i)
  })

  it('groups every report field under what happens to it', () => {
    renderLanding()
    for (const verb of ['Removed entirely', 'Generalised', 'Kept']) {
      expect(screen.getByText(verb)).toBeInTheDocument()
    }
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Approximate location')).toBeInTheDocument()
  })
})

describe('SiteHeader', () => {
  it('offers a way into the page as well as a way out of it', () => {
    renderLanding()
    const sections = within(screen.getByRole('navigation', { name: /sections/i })).getAllByRole(
      'link',
    )
    expect(sections.map((l) => l.getAttribute('href'))).toEqual(['#mechanism', '#privacy'])
  })

  it('points every header section link at a section that exists', () => {
    const { container } = renderLanding()
    const nav = screen.getByRole('navigation', { name: /sections/i })
    for (const link of within(nav).getAllByRole('link')) {
      const id = (link.getAttribute('href') ?? '').slice(1)
      expect(container.querySelector(`#${id}`)).not.toBeNull()
    }
  })
})
