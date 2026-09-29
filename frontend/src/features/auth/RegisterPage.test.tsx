import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { resetSession, sessionState } from '@/lib/api/session'
import { QueryWrapper } from '@/test/queryWrapper'
import { displayCode } from './inviteCode'
import { RegisterPage } from './RegisterPage'

const PREVIEW = {
  facilityCode: 'LKY0001016',
  facilityName: 'Peradeniya',
  institutionType: 'Teaching',
  districtCode: 'KDY',
  districtName: 'Kandy',
}

const SESSION = {
  accessToken: 'token',
  accessTokenExpiresAt: '2030-01-01T00:00:00Z',
  account: {
    id: 3,
    email: 'clinic@example.org',
    displayName: 'Clinic staff',
    role: 'DATA_PROVIDER',
    districts: [],
    facility: { code: 'LKY0001016', name: 'Peradeniya', districtCode: 'KDY' },
  },
}

let fetchMock: Mock<(url: string, init?: RequestInit) => Promise<Response>>

beforeEach(() => {
  resetSession()
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const body = JSON.parse((init?.body as string | undefined) ?? '{}') as Record<string, string>
    if (url === '/api/auth/invite-codes/check') {
      return Promise.resolve(
        body.inviteCode === 'KDY-7X2-M4QP'
          ? Response.json(PREVIEW)
          : Response.json(
              { detail: 'No facility has this invite code. Check it with whoever gave it.' },
              { status: 404 },
            ),
      )
    }
    if (url === '/api/auth/register') {
      return Promise.resolve(
        (body.password ?? '').length < 12
          ? Response.json(
              {
                detail: 'The request has invalid fields.',
                errors: [{ field: 'password', message: 'must be at least 12 characters' }],
              },
              { status: 400 },
            )
          : Response.json(SESSION, { status: 201 }),
      )
    }
    return Promise.resolve(Response.json({}))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <QueryWrapper>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/submit" element={<p>Submit a report</p>} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  )
}

async function enterCode(code: string) {
  await userEvent.type(screen.getByLabelText('Facility invite code'), code)
  await userEvent.click(screen.getByRole('button', { name: 'Check the code' }))
}

async function fillAccount(password: string) {
  await userEvent.type(await screen.findByLabelText('Your name'), 'Clinic staff')
  await userEvent.type(screen.getByLabelText('Email address'), 'clinic@example.org')
  await userEvent.type(screen.getByLabelText('Password'), password)
  await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('RegisterPage', () => {
  it('asks for nothing but the invite code at first', () => {
    renderPage()

    expect(screen.getByLabelText('Facility invite code')).toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('refuses a code that matches no facility, and goes no further', async () => {
    renderPage()
    await enterCode('KDY-AAA-AAAA')

    expect(await screen.findByRole('alert')).toHaveTextContent('No facility has this invite code.')
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('names the facility a code belongs to before asking for a password', async () => {
    renderPage()
    await enterCode('KDY-7X2-M4QP')

    expect(await screen.findByText('Peradeniya')).toBeInTheDocument()
    expect(screen.getByText(/Kandy district/)).toBeInTheDocument()
  })

  it('shows which registration step the visitor is on, and what the first one settled', async () => {
    renderPage()
    const steps = () => within(screen.getByRole('list', { name: 'Registration steps' }))

    expect(steps().getByText('Invite code').closest('li')).toHaveAttribute('aria-current', 'step')

    await enterCode('KDY-7X2-M4QP')
    await screen.findByLabelText('Your name')

    expect(steps().getByText('Your account').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(steps().getByText('Invite code').closest('li')).toHaveTextContent('done')
    expect(steps().getByText('KDY-7X2-M4QP')).toBeInTheDocument()
  })

  it('shows a code in its issued form however it was typed', () => {
    expect(displayCode('kdyprnrudt')).toBe('KDY-PRN-RUDT')
    expect(displayCode(' kdy-prn-rudt ')).toBe('KDY-PRN-RUDT')
    expect(displayCode('kdy-prn')).toBe('KDY-PRN')
  })

  it('registers, signs in, and opens report submission', async () => {
    renderPage()
    await enterCode('KDY-7X2-M4QP')
    await fillAccount('a long enough password')

    expect(await screen.findByText('Submit a report')).toBeInTheDocument()
    expect(sessionState().status).toBe('signed-in')
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/auth/register') ?? []
    expect(JSON.parse(init?.body as string)).toMatchObject({ inviteCode: 'KDY-7X2-M4QP' })
  })

  it('shows a refused field beside the field', async () => {
    renderPage()
    await enterCode('KDY-7X2-M4QP')
    await fillAccount('too short')

    expect(await screen.findByText('must be at least 12 characters')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
  })

  it('never offers inspectors a way to register', () => {
    renderPage()

    expect(screen.getByText(/created by a system administrator/i)).toBeInTheDocument()
  })
})
