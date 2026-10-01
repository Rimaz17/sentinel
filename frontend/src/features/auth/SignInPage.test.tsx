import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { resetSession, type Session } from '@/lib/api/session'
import { DEMO } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import { AccountMenu } from './AccountBar'
import { RequireRole } from './RequireRole'
import { afterSignIn, aRole, mayOpen, useAccount } from './session'
import { SignInPage } from './SignInPage'

function session(role: Session['account']['role']): Session {
  return {
    accessToken: 'token',
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    account: {
      id: 1,
      email: 'phi@example.org',
      displayName: 'Nimal Silva',
      role,
      districts: role === 'PHI' ? ['KDY'] : [],
      facility: null,
    },
  }
}

/** An inspector covering every district, a different account from the Kandy one. */
function nationalSession(): Session {
  const kandy = session('PHI')
  return {
    ...kandy,
    account: {
      ...kandy.account,
      id: 2,
      email: 'national@example.org',
      displayName: 'Kamala Perera',
      districts: ['*'],
    },
  }
}

let fetchMock: Mock<(url: string, init?: RequestInit) => Promise<Response>>

function signedOut(url: string, init?: RequestInit): Promise<Response> {
  if (url === '/api/auth/refresh') {
    return Promise.resolve(Response.json({ detail: 'Not signed in.' }, { status: 401 }))
  }
  if (url === '/api/auth/signin') {
    const { email, password } = JSON.parse(init?.body as string) as {
      email: string
      password: string
    }
    return Promise.resolve(
      password === 'the right password'
        ? Response.json(email === 'national@example.org' ? nationalSession() : session('PHI'))
        : Response.json({ detail: 'The email address or password is not right.' }, { status: 401 }),
    )
  }
  if (url === '/api/public/demo') {
    return Promise.resolve(Response.json({ detail: 'Not found.' }, { status: 404 }))
  }
  return Promise.resolve(Response.json({}))
}

/** The API in demo mode: the same, but the demo accounts are published. */
function inDemoMode(url: string, init?: RequestInit): Promise<Response> {
  return url === '/api/public/demo' ? Promise.resolve(Response.json(DEMO)) : signedOut(url, init)
}

beforeEach(() => {
  resetSession()
  fetchMock = vi.fn(signedOut)
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
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/app" element={<p>Inspector dashboard</p>} />
          <Route
            path="/app/districts/:code"
            element={
              <RequireRole allow="PHI">
                <KandyPage />
              </RequireRole>
            }
          />
          <Route
            path="/app/admin"
            element={
              <RequireRole allow="ADMIN">
                <p>Administration</p>
              </RequireRole>
            }
          />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  )
}

function KandyPage() {
  const account = useAccount()
  return (
    <>
      <p>Kandy for inspectors</p>
      <AccountMenu account={account} />
    </>
  )
}

async function signIn(password: string, email = 'phi@example.org') {
  await userEvent.type(await screen.findByLabelText('Email address'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
}

describe('SignInPage', () => {
  it('signs an inspector in and takes them to the dashboard', async () => {
    renderAt('/signin')
    await signIn('the right password')

    expect(await screen.findByText('Inspector dashboard')).toBeInTheDocument()
  })

  it('says why sign-in was refused, in the API’s words', async () => {
    renderAt('/signin')
    await signIn('a wrong password')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The email address or password is not right.',
    )
  })

  it('tells an inspector without an account to contact their administrator', async () => {
    renderAt('/signin')
    expect(await screen.findByText(/contact their district administrator/i)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument()
  })

  it('says where signing in takes each kind of staff', async () => {
    renderAt('/signin')
    const routes = within(await screen.findByRole('list', { name: 'Where signing in takes you' }))

    expect(routes.getByText('Healthcare data provider')).toBeInTheDocument()
    expect(routes.getByText('Report submission')).toBeInTheDocument()
    expect(routes.getByText('Public health inspector')).toBeInTheDocument()
    expect(routes.getByText('Internal dashboard')).toBeInTheDocument()
  })

  it('sends a signed-out visitor to sign in, then back where they were going', async () => {
    renderAt('/app/districts/KDY')

    expect(await screen.findByRole('heading', { name: 'Staff sign-in' })).toBeInTheDocument()
    await signIn('the right password')
    expect(await screen.findByText('Kandy for inspectors')).toBeInTheDocument()
  })

  it('starts the next account at home, not in the district the last one signed out of', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      url === '/api/auth/refresh'
        ? Promise.resolve(Response.json(session('PHI')))
        : signedOut(url, init),
    )
    renderAt('/app/districts/KDY')
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))

    await signIn('the right password', 'national@example.org')
    expect(await screen.findByText('Inspector dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Kandy for inspectors')).not.toBeInTheDocument()
  })

  it('brings the same account back to the page it signed out of', async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) =>
      url === '/api/auth/refresh'
        ? Promise.resolve(Response.json(session('PHI')))
        : signedOut(url, init),
    )
    renderAt('/app/districts/KDY')
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))

    await signIn('the right password')
    expect(await screen.findByText('Kandy for inspectors')).toBeInTheDocument()
  })

  it('keeps a page from an account with another role', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/api/auth/refresh' ? Response.json(session('PHI')) : Response.json({}),
      ),
    )
    renderAt('/app/admin')

    expect(
      await screen.findByRole('heading', { name: 'This page is not for your account.' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Administration')).not.toBeInTheDocument()
  })

  it('recognises someone already signed in and offers to sign them out', async () => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url === '/api/auth/refresh'
          ? Response.json(session('PHI'))
          : new Response(null, { status: 204 }),
      ),
    )
    renderAt('/signin')

    expect(await screen.findByText(/signed in as/i)).toHaveTextContent('Nimal Silva')
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByLabelText('Email address')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/signout', expect.anything())
  })

  it('goes home instead of to a page left behind that this account may not open', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/signin', state: { from: '/app/admin' } }]}>
        <QueryWrapper>
          <Routes>
            <Route path="/signin" element={<SignInPage />} />
            <Route path="/app" element={<p>Inspector dashboard</p>} />
            <Route path="/app/admin" element={<p>Administration</p>} />
          </Routes>
        </QueryWrapper>
      </MemoryRouter>,
    )
    await signIn('the right password')

    expect(await screen.findByText('Inspector dashboard')).toBeInTheDocument()
  })
})

describe('afterSignIn', () => {
  const kandy = session('PHI').account
  const national = nationalSession().account

  it('returns to a page left when nobody was signed in', () => {
    expect(afterSignIn(national, { from: '/app/districts/KDY', leftBy: null })).toBe(
      '/app/districts/KDY',
    )
  })

  it('returns the account that left a page to it', () => {
    expect(afterSignIn(kandy, { from: '/app/districts/KDY', leftBy: kandy.id })).toBe(
      '/app/districts/KDY',
    )
  })

  it('sends a different account home, even one whose role may open the page', () => {
    expect(afterSignIn(national, { from: '/app/districts/KDY', leftBy: kandy.id })).toBe('/app')
  })

  it('sends an account home with no page left, or one its role may not open', () => {
    expect(afterSignIn(kandy, null)).toBe('/app')
    expect(afterSignIn(kandy, { from: '/app/admin', leftBy: null })).toBe('/app')
  })
})

describe('SignInPage in demo mode', () => {
  it('shows no demo accounts unless the API is in demo mode', async () => {
    renderAt('/signin')

    await screen.findByLabelText('Email address')
    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/public/demo', expect.anything()),
    )
    expect(screen.queryByRole('region', { name: 'Demo accounts' })).not.toBeInTheDocument()
  })

  it('lists the four demo accounts with their email and password in plain sight', async () => {
    fetchMock.mockImplementation(inDemoMode)
    renderAt('/signin')

    const panel = await screen.findByRole('region', { name: 'Demo accounts' })
    const names = within(panel)
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent)
    expect(names).toEqual([
      'Administrator',
      'Public health inspector',
      'Public health inspector',
      'Data provider',
    ])
    expect(within(panel).getByText('Colombo only')).toBeInTheDocument()
    expect(within(panel).getByText('inspector.colombo@demo.sentinel.test')).toBeInTheDocument()
    expect(within(panel).getAllByText('the right password')).toHaveLength(4)
    expect(within(panel).getByText(/every night at 3:00 Sri Lanka time/)).toBeInTheDocument()
  })

  it('fills in an account, leaving the visitor to sign in through the form', async () => {
    fetchMock.mockImplementation(inDemoMode)
    renderAt('/signin')

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Use this account: Public health inspector · Colombo only',
      }),
    )

    expect(screen.getByLabelText('Email address')).toHaveValue(
      'inspector.colombo@demo.sentinel.test',
    )
    expect(screen.getByLabelText('Password')).toHaveValue('the right password')
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Filled in the demo account: Public health inspector · Colombo only.',
    )
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/signin', expect.anything())

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Inspector dashboard')).toBeInTheDocument()
  })
})

describe('SignInPage: the way to the demo accounts', () => {
  it('offers a way down to the demo accounts, and takes focus there', async () => {
    fetchMock.mockImplementation(inDemoMode)
    renderAt('/signin')

    await userEvent.click(await screen.findByRole('button', { name: 'Try a demo account' }))

    expect(screen.getByRole('heading', { level: 2, name: 'Demo accounts' })).toHaveFocus()
  })

  it('offers nothing of the kind outside demo mode', async () => {
    renderAt('/signin')

    await screen.findByLabelText('Email address')
    await vi.waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/public/demo', expect.anything()),
    )
    expect(screen.queryByRole('button', { name: 'Try a demo account' })).not.toBeInTheDocument()
  })
})

describe('mayOpen and aRole', () => {
  it('lets each role open only its own pages', () => {
    expect(mayOpen('PHI', '/app/districts/KDY')).toBe(true)
    expect(mayOpen('PHI', '/app/admin')).toBe(false)
    expect(mayOpen('ADMIN', '/app/admin/facilities')).toBe(true)
    expect(mayOpen('ADMIN', '/submit')).toBe(false)
    expect(mayOpen('DATA_PROVIDER', '/submit')).toBe(true)
    expect(mayOpen('DATA_PROVIDER', '/app')).toBe(false)
  })

  it('puts the right article before a role', () => {
    expect(aRole('ADMIN')).toBe('an administrator')
    expect(aRole('PHI')).toBe('a public health inspector')
    expect(aRole('DATA_PROVIDER')).toBe('a data provider')
  })
})
