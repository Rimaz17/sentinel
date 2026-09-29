import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { resetSession, type Session, setSession } from '@/lib/api/session'
import { QueryWrapper } from '@/test/queryWrapper'
import { SubmitPage } from './SubmitPage'

const PROVIDER: Session = {
  accessToken: 'provider-token',
  accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
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
  setSession(PROVIDER)
  fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    const body = JSON.parse(init?.body as string) as { latitude: number | null }
    return Promise.resolve(
      body.latitude !== null && body.latitude > 10
        ? Response.json(
            {
              detail: 'The request has invalid fields.',
              errors: [{ field: 'latitude', message: 'must be less than or equal to 10.0' }],
            },
            { status: 400 },
          )
        : Response.json(
            { reportId: '0b6f7d3c', receivedAt: '2026-09-28T08:30:00Z' },
            { status: 202 },
          ),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage() {
  return render(
    <MemoryRouter>
      <QueryWrapper>
        <SubmitPage />
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('SubmitPage', () => {
  it('names the facility the account submits for', () => {
    renderPage()
    expect(screen.getByText('Peradeniya')).toBeInTheDocument()
    expect(screen.getByText(/every report you submit counts as its own/i)).toBeInTheDocument()
  })

  it('asks for nothing that identifies a patient', () => {
    renderPage()
    for (const identity of [/name/i, /nic/i, /date of birth/i, /phone/i, /address/i]) {
      expect(screen.queryByRole('textbox', { name: identity })).not.toBeInTheDocument()
    }
  })

  it('submits a report and lists it', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('radio', { name: /dengue-like/i }))
    await userEvent.type(screen.getByLabelText('Age in years'), '37')
    await userEvent.click(screen.getByRole('button', { name: 'Submit report' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Dengue-like report received.')
    const list = screen.getByRole('complementary', { name: 'Submitted this session' })
    expect(within(list).getByText('Dengue-like')).toBeInTheDocument()

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/ingestion/reports')
    const body = JSON.parse(init?.body as string) as Record<string, unknown>
    expect(body).toMatchObject({ symptomGroup: 'DENGUE_LIKE', age: 37 })
    expect(Object.keys(body)).not.toContain('facilityCode')
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer provider-token')
  })

  it('asks for a symptom group and an age before sending anything', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Submit report' }))

    expect(screen.getByText(/choose the symptom group/i)).toBeInTheDocument()
    expect(screen.getByText(/enter the patient’s age/i)).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows a refused field beside the field', async () => {
    renderPage()
    await userEvent.click(screen.getByRole('radio', { name: /influenza-like/i }))
    await userEvent.type(screen.getByLabelText('Age in years'), '40')
    await userEvent.type(screen.getByLabelText('Latitude'), '12.5')
    await userEvent.type(screen.getByLabelText('Longitude'), '80.6')
    await userEvent.click(screen.getByRole('button', { name: 'Submit report' }))

    expect(await screen.findByText('must be less than or equal to 10.0')).toBeInTheDocument()
    expect(screen.getByLabelText('Latitude')).toHaveAttribute('aria-invalid', 'true')
  })
})
