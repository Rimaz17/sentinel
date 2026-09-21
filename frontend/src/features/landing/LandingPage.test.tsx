import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('exposes the plate switcher as a tab list', () => {
    renderLanding()
    const tabs = within(screen.getByRole('tablist', { name: /plate/i })).getAllByRole('tab')
    expect(tabs).toHaveLength(4)
    expect(tabs.filter((t) => t.getAttribute('aria-selected') === 'true')).toHaveLength(1)
  })

  it('opens on the signal plate', () => {
    renderLanding()
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/signal/i)
  })
})

describe('LandingPage — plate switching', () => {
  it('changes the caption and the hero readout together', async () => {
    const user = userEvent.setup()
    renderLanding()

    // The signal plate's readout and caption.
    expect(screen.getByText('3.2σ')).toBeInTheDocument()
    expect(
      screen.getByText(/one district rises clear of its own normal range/i),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /cluster/i }))

    // Both must move at once — the rail is a readout of the plate, so a caption
    // that changed while the measurement lagged would be a lie on the page.
    expect(screen.getByText('17 in 2 km')).toBeInTheDocument()
    expect(screen.queryByText('3.2σ')).not.toBeInTheDocument()
    expect(screen.getByText(/a second check runs alongside the first/i)).toBeInTheDocument()
  })

  it('moves between plates with the arrow keys', async () => {
    const user = userEvent.setup()
    renderLanding()

    await user.click(screen.getByRole('tab', { name: /baseline/i }))
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/baseline/i)

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/signal/i)

    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/baseline/i)
  })

  it('wraps from the first plate to the last', async () => {
    const user = userEvent.setup()
    renderLanding()

    await user.click(screen.getByRole('tab', { name: /baseline/i }))
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/spread/i)
  })

  it('jumps to the first and last plates with Home and End', async () => {
    const user = userEvent.setup()
    renderLanding()

    await user.click(screen.getByRole('tab', { name: /signal/i }))
    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/spread/i)

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { selected: true })).toHaveAccessibleName(/baseline/i)
  })

  it('gives every plate a text alternative carrying the same information', async () => {
    const user = userEvent.setup()
    renderLanding()

    expect(screen.getByText(/rising well clear of the shaded normal range/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /spread/i }))
    expect(screen.getByText(/spread evenly across a district with no ring/i)).toBeInTheDocument()
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
