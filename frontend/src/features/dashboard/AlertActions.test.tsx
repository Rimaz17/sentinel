import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { alert } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import { AlertActions } from './AlertActions'
import type { Alert } from './api/types'
import { publicationWords } from './publication'

let fetchMock: Mock<(url: string, init?: RequestInit) => Promise<Response>>

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve(Response.json(alert())))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderActions(overrides: Partial<Alert> = {}) {
  return render(
    <QueryWrapper>
      <AlertActions alert={alert(overrides)} />
    </QueryWrapper>,
  )
}

function sent(): [string, unknown][] {
  return fetchMock.mock.calls.map(([url, init]) => [
    url,
    JSON.parse(init?.body as string) as unknown,
  ])
}

describe('AlertActions', () => {
  it('offers the next step, a verdict and closing on a new alert', () => {
    renderActions()

    for (const name of ['Acknowledge', 'Confirm', 'Mark a false alarm', 'Close']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument()
    }
  })

  it('moves an alert on in one click', async () => {
    renderActions()
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }))

    expect(sent()).toEqual([['/api/alerts/A-1001/status', { status: 'ACKNOWLEDGED' }]])
  })

  it('offers investigating after acknowledging', () => {
    renderActions({ status: 'ACKNOWLEDGED' })

    expect(screen.getByRole('button', { name: 'Start investigating' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Acknowledge' })).not.toBeInTheDocument()
  })

  it('asks before confirming, because confirming publishes', async () => {
    renderActions()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    expect(screen.getByText(/published on the public dashboard/i)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Yes, confirm and publish' }))
    expect(sent()).toEqual([['/api/alerts/A-1001/verdict', { verdict: 'CONFIRMED' }]])
  })

  it('sends nothing when the question is cancelled', async () => {
    renderActions()
    await userEvent.click(screen.getByRole('button', { name: 'Mark a false alarm' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Acknowledge' })).toBeInTheDocument()
  })

  it('offers no verdict once one is given', () => {
    renderActions({ verdict: 'CONFIRMED', published: true })

    expect(screen.queryByRole('button', { name: 'Confirm' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('offers nothing on a closed alert', () => {
    renderActions({ status: 'CLOSED', open: false })

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('says why an action was refused', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        Response.json(
          { detail: 'Someone else changed this alert a moment ago. Reload it and try again.' },
          { status: 409 },
        ),
      ),
    )
    renderActions()
    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Someone else changed this alert')
  })
})

describe('publicationWords', () => {
  it('says whether and why the public sees an alert', () => {
    expect(publicationWords(alert())).toBe('Not published')
    expect(publicationWords(alert({ published: true }))).toBe(
      'Published: past the higher threshold',
    )
    expect(publicationWords(alert({ verdict: 'CONFIRMED', published: true }))).toBe(
      'Confirmed · published',
    )
    expect(publicationWords(alert({ verdict: 'FALSE_ALARM', status: 'CLOSED' }))).toBe(
      'False alarm · not published',
    )
  })
})
