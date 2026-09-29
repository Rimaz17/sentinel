import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { resetSession } from '@/lib/api/session'
import { inspectorSession } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import { ActivatePage } from './ActivatePage'

let fetchMock: Mock<(url: string, init?: RequestInit) => Promise<Response>>

beforeEach(() => {
  resetSession()
  fetchMock = vi.fn((url: string, init?: RequestInit) => {
    const body = JSON.parse(init?.body as string) as { token: string; password?: string }
    if (body.token !== 'good-link') {
      return Promise.resolve(
        Response.json(
          { detail: 'This link has expired or has already been used.' },
          { status: 404 },
        ),
      )
    }
    if (url === '/api/auth/activation/check') {
      return Promise.resolve(
        Response.json({
          email: 'phi@example.org',
          displayName: 'Nimal Silva',
          role: 'PHI',
          activated: false,
        }),
      )
    }
    return Promise.resolve(Response.json(inspectorSession(['KDY'])))
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function Address() {
  const { pathname, hash } = useLocation()
  return <p data-testid="address">{pathname + hash}</p>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <QueryWrapper>
        <Address />
        <Routes>
          <Route path="/activate" element={<ActivatePage />} />
          <Route path="/app" element={<p>Inspector dashboard</p>} />
        </Routes>
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('ActivatePage', () => {
  it('greets the link’s owner and takes the secret out of the address', async () => {
    renderAt('/activate#token=good-link')

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Welcome, Nimal Silva.' }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('address')).toHaveTextContent(/^\/activate$/)
  })

  it('marks the link as checked and the password as the current step', async () => {
    renderAt('/activate#token=good-link')
    await screen.findByRole('heading', { level: 1, name: 'Welcome, Nimal Silva.' })
    const steps = within(screen.getByRole('list', { name: 'Activation steps' }))

    expect(steps.getByText('Your link').closest('li')).toHaveTextContent('done')
    expect(steps.getByText('Your password').closest('li')).toHaveAttribute('aria-current', 'step')
  })

  it('sets the password, signs the inspector in and opens the dashboard', async () => {
    renderAt('/activate#token=good-link')

    await userEvent.type(await screen.findByLabelText('Password'), 'a long enough password')
    await userEvent.type(screen.getByLabelText('The same password again'), 'a long enough password')
    await userEvent.click(screen.getByRole('button', { name: 'Set password and sign in' }))

    expect(await screen.findByText('Inspector dashboard')).toBeInTheDocument()
  })

  it('catches two passwords that differ before sending either', async () => {
    renderAt('/activate#token=good-link')

    await userEvent.type(await screen.findByLabelText('Password'), 'a long enough password')
    await userEvent.type(screen.getByLabelText('The same password again'), 'a different password')
    await userEvent.click(screen.getByRole('button', { name: 'Set password and sign in' }))

    expect(await screen.findByText('does not match the password above')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain('/api/auth/activate')
  })

  it('says so when the link has been used or has expired', async () => {
    renderAt('/activate#token=spent-link')

    expect(await screen.findByRole('alert')).toHaveTextContent('expired or has already been used')
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
  })

  it('explains an address with no link in it', () => {
    renderAt('/activate')

    expect(screen.getByRole('alert')).toHaveTextContent('This address has no link in it.')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
