import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { resetSession, type Session, setSession } from '@/lib/api/session'
import { DEMO } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import type { AdminAccount, AdminFacility } from './api'
import { AdminPage } from './AdminPage'

const ADMIN: Session = {
  accessToken: 'admin-token',
  accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  account: {
    id: 1,
    email: 'admin@example.org',
    displayName: 'Administrator',
    role: 'ADMIN',
    districts: [],
    facility: null,
  },
}

function account(overrides: Partial<AdminAccount> = {}): AdminAccount {
  return {
    id: 5,
    email: 'phi@example.org',
    displayName: 'Nimal Silva',
    role: 'PHI',
    districts: ['KDY'],
    facilityCode: null,
    facilityName: null,
    enabled: true,
    activated: true,
    createdAt: '2026-09-20T04:00:00Z',
    activationExpiresAt: null,
    lockedInDemo: false,
    ...overrides,
  }
}

const PERADENIYA: AdminFacility = {
  code: 'LKY0001016',
  name: 'Peradeniya',
  districtCode: 'KDY',
  category: 'HOSPITAL',
  institutionType: 'Teaching',
  inviteIssuedAt: null,
  dataProviderAccounts: 0,
  lockedInDemo: false,
}

let fetchMock: Mock<(url: string, init?: RequestInit) => Promise<Response>>
let demoMode = false

function respond(url: string, init?: RequestInit): Response {
  const method = init?.method ?? 'GET'
  if (url === '/api/public/demo') {
    return demoMode ? Response.json(DEMO) : Response.json({ detail: 'Not found.' }, { status: 404 })
  }
  if (url === '/api/public/districts') {
    return Response.json([
      { code: 'KDY', name: 'Kandy' },
      { code: 'MTL', name: 'Matale' },
    ])
  }
  if (url === '/api/admin/accounts') {
    return Response.json([
      account({ id: 1, displayName: 'Administrator', role: 'ADMIN', districts: [] }),
      account(),
    ])
  }
  if (url === '/api/admin/inspectors' && method === 'POST') {
    return Response.json(
      {
        account: account({ id: 9, displayName: 'Kumari Perera', activated: false }),
        activationToken: 'one-time-secret',
        activationExpiresAt: '2026-10-05T04:00:00Z',
      },
      { status: 201 },
    )
  }
  if (url.startsWith('/api/admin/accounts/5') && method === 'PATCH') {
    return Response.json(account({ enabled: false }))
  }
  if (url.startsWith('/api/admin/facilities?')) {
    return Response.json([PERADENIYA])
  }
  if (url === '/api/admin/facilities/LKY0001016/invite-code' && method === 'POST') {
    return Response.json(
      { facilityCode: 'LKY0001016', inviteCode: 'KDY-7X2-M4QP', issuedAt: '2026-09-28T04:00:00Z' },
      { status: 201 },
    )
  }
  return Response.json({ detail: 'Not found.' }, { status: 404 })
}

beforeEach(() => {
  demoMode = false
  resetSession()
  setSession(ADMIN)
  fetchMock = vi.fn((url: string, init?: RequestInit) => Promise.resolve(respond(url, init)))
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
          <Route path="/app/admin/*" element={<AdminPage />} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('AdminPage: accounts', () => {
  it('lists accounts with what each covers and its state', async () => {
    renderAt('/app/admin')

    const row = await screen.findByRole('article', { name: 'Nimal Silva' })
    expect(within(row).getByText('Covers Kandy')).toBeInTheDocument()
    expect(within(row).getByText(/^Active/)).toBeInTheDocument()
  })

  it('groups the accounts by role, inspectors first', async () => {
    renderAt('/app/admin')

    await screen.findByRole('article', { name: 'Nimal Silva' })
    const groups = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(groups).toEqual(['Public health inspectors1', 'Administrators1'])
    const inspectors = screen.getByRole('region', { name: /^Public health inspectors/ })
    expect(within(inspectors).getByRole('article', { name: 'Nimal Silva' })).toBeInTheDocument()
  })

  it('offers a search once the list is long, matching names and emails', async () => {
    const many = Array.from({ length: 7 }, (_, index) =>
      account({
        id: 20 + index,
        displayName: `Inspector ${index}`,
        email: `i${index}@example.org`,
      }),
    )
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve(
        url === '/api/admin/accounts'
          ? Response.json([...many, account({ displayName: 'Kumari Perera', email: 'kp@x.org' })])
          : respond(url, init),
      ),
    )
    renderAt('/app/admin')

    await userEvent.type(await screen.findByLabelText('Find an account'), 'kp@x')
    expect(screen.getByRole('article', { name: 'Kumari Perera' })).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Inspector 0' })).not.toBeInTheDocument()

    await userEvent.clear(screen.getByLabelText('Find an account'))
    await userEvent.type(screen.getByLabelText('Find an account'), 'nobody')
    expect(screen.getByText('No account matches “nobody”.')).toBeInTheDocument()
  })

  it('never offers an administrator a way to disable their own account', async () => {
    renderAt('/app/admin')

    const own = await screen.findByRole('article', { name: 'Administrator' })
    expect(within(own).queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument()
  })

  it('creates an inspector and shows their link once', async () => {
    renderAt('/app/admin')

    await userEvent.type(screen.getByLabelText('Name'), 'Kumari Perera')
    await userEvent.type(screen.getByLabelText('Email address'), 'kumari@example.org')
    await userEvent.click(await screen.findByRole('checkbox', { name: 'Matale' }))
    await userEvent.click(screen.getByRole('button', { name: 'Create and get a link' }))

    const shown = await screen.findByRole('region', { name: 'Activation link' })
    expect(shown).toHaveTextContent(`${window.location.origin}/activate#token=one-time-secret`)
    expect(shown).toHaveTextContent('Kumari Perera')
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/admin/inspectors') ?? []
    expect(JSON.parse(init?.body as string)).toMatchObject({ districts: ['MTL'] })

    await userEvent.click(within(shown).getByRole('button', { name: 'Done' }))
    expect(screen.queryByText(/one-time-secret/)).not.toBeInTheDocument()
  })

  it('asks for every district as the wildcard', async () => {
    renderAt('/app/admin')

    await userEvent.type(screen.getByLabelText('Name'), 'National')
    await userEvent.type(screen.getByLabelText('Email address'), 'national@example.org')
    await userEvent.click(screen.getByRole('checkbox', { name: /every district/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Create and get a link' }))

    await screen.findByRole('region', { name: 'Activation link' })
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/admin/inspectors') ?? []
    expect(JSON.parse(init?.body as string)).toMatchObject({ districts: ['*'] })
  })

  it('disables an account', async () => {
    renderAt('/app/admin')

    const row = await screen.findByRole('article', { name: 'Nimal Silva' })
    await userEvent.click(within(row).getByRole('button', { name: 'Disable' }))

    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/admin/accounts/5') ?? []
    expect(init?.method).toBe('PATCH')
    expect(JSON.parse(init?.body as string)).toEqual({ enabled: false })
  })
})

describe('AdminPage: facilities', () => {
  it('lists a district’s facilities with their invite status', async () => {
    renderAt('/app/admin/facilities')

    const row = await screen.findByRole('article', { name: 'Peradeniya' })
    expect(row).toHaveTextContent('no code')
    expect(row).toHaveTextContent('0 accounts')
  })

  it('issues a code and shows it once', async () => {
    renderAt('/app/admin/facilities')

    const row = await screen.findByRole('article', { name: 'Peradeniya' })
    await userEvent.click(within(row).getByRole('button', { name: 'Issue a code' }))

    expect(await screen.findByRole('region', { name: 'Invite code' })).toHaveTextContent(
      'KDY-7X2-M4QP',
    )
  })

  it('sends an unknown address back to the accounts', async () => {
    renderAt('/app/admin/nothing-here')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Inspectors and accounts' }),
    ).toBeInTheDocument()
  })
})

describe('AdminPage: the demo administrator', () => {
  const DEMO_ADMIN: Session = {
    ...ADMIN,
    account: { ...ADMIN.account, email: 'admin@demo.sentinel.test' },
  }

  function asDemoAdministrator(accounts: AdminAccount[], facilities: AdminFacility[] = []) {
    demoMode = true
    setSession(DEMO_ADMIN)
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      Promise.resolve(
        url === '/api/admin/accounts'
          ? Response.json(accounts)
          : url.startsWith('/api/admin/facilities?')
            ? Response.json(facilities)
            : respond(url, init),
      ),
    )
  }

  it('says which changes are switched off, and leaves them visible but disabled', async () => {
    asDemoAdministrator([
      account({ id: 6, displayName: 'Demo inspector, Colombo', lockedInDemo: true }),
      account({ id: 7, displayName: 'A visitor’s inspector' }),
    ])
    renderAt('/app/admin')

    const locked = await screen.findByRole('article', { name: 'Demo inspector, Colombo' })
    expect(within(locked).getByText('Switched off in the demo')).toBeInTheDocument()
    expect(within(locked).getByRole('button', { name: 'Disable' })).toBeDisabled()
    expect(within(locked).getByRole('button', { name: 'New password link' })).toBeDisabled()

    const open = screen.getByRole('article', { name: 'A visitor’s inspector' })
    expect(within(open).queryByText('Switched off in the demo')).not.toBeInTheDocument()
    expect(within(open).getByRole('button', { name: 'Disable' })).toBeEnabled()

    expect(await screen.findByText(/You are the demo administrator/)).toBeInTheDocument()
    expect(screen.getByText(/Use a made-up name and email address/)).toBeInTheDocument()
  })

  it('leaves the published invite code disabled', async () => {
    asDemoAdministrator(
      [],
      [{ ...PERADENIYA, inviteIssuedAt: '2026-09-28T04:00:00Z', lockedInDemo: true }],
    )
    renderAt('/app/admin/facilities')

    const row = await screen.findByRole('article', { name: 'Peradeniya' })
    expect(within(row).getByText('Switched off in the demo')).toBeInTheDocument()
    expect(within(row).getByRole('button', { name: 'Issue a new code' })).toBeDisabled()
    expect(within(row).getByRole('button', { name: 'Revoke' })).toBeDisabled()
  })

  it('tells no other administrator anything about the demo', async () => {
    demoMode = true
    renderAt('/app/admin')

    await screen.findByRole('article', { name: 'Nimal Silva' })
    expect(screen.queryByText(/demo administrator/)).not.toBeInTheDocument()
    expect(screen.queryByText('Switched off in the demo')).not.toBeInTheDocument()
  })
})
