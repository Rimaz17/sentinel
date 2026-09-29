import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { resetSession, type Session } from '@/lib/api/session'
import { QueryWrapper } from '@/test/queryWrapper'
import { RequireRole } from './RequireRole'
import { aRole, mayOpen } from './session'
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

let fetchMock: Mock<(url: string, init?: RequestInit) => Promise<Response>>

function signedOut(url: string, init?: RequestInit): Promise<Response> {
  if (url === '/api/auth/refresh') {
    return Promise.resolve(Response.json({ detail: 'Not signed in.' }, { status: 401 }))
  }
  if (url === '/api/auth/signin') {
    const { password } = JSON.parse(init?.body as string) as { password: string }
    return Promise.resolve(
      password === 'the right password'
        ? Response.json(session('PHI'))
        : Response.json({ detail: 'The email address or password is not right.' }, { status: 401 }),
    )
  }
  return Promise.resolve(Response.json({}))
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
                <p>Kandy for inspectors</p>
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

async function signIn(password: string) {
  await userEvent.type(await screen.findByLabelText('Email address'), 'phi@example.org')
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

  it('sends a signed-out visitor to sign in, then back where they were going', async () => {
    renderAt('/app/districts/KDY')

    expect(await screen.findByRole('heading', { name: 'Staff sign-in' })).toBeInTheDocument()
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
