import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renewSession, resetSession, type Session, sessionState } from './session'

const SESSION: Session = {
  accessToken: 'token',
  accessTokenExpiresAt: '2026-09-28T09:00:00Z',
  account: {
    id: 1,
    email: 'phi@example.org',
    displayName: 'Nimal Silva',
    role: 'PHI',
    districts: ['KDY'],
    facility: null,
  },
}

beforeEach(() => {
  resetSession()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('renewSession', () => {
  it('signs in from the refresh cookie', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json(SESSION))),
    )

    await expect(renewSession()).resolves.toEqual(SESSION)
    expect(sessionState()).toEqual({ status: 'signed-in', session: SESSION })
  })

  it('shares one request between callers who ask at once', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(Response.json(SESSION)))
    vi.stubGlobal('fetch', fetchMock)

    await Promise.all([renewSession(), renewSession(), renewSession()])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('tries once more after a refusal, as a second tab may have just renewed', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ detail: 'Not signed in.' }, { status: 401 }))
      .mockResolvedValueOnce(Response.json(SESSION))
    vi.stubGlobal('fetch', fetchMock)

    await expect(renewSession()).resolves.toEqual(SESSION)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('is signed out when there is no session to renew', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json({ detail: 'Not signed in.' }, { status: 401 }))),
    )

    await expect(renewSession()).resolves.toBeNull()
    expect(sessionState().status).toBe('signed-out')
  })

  it('never stores the token where a script could find it later', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json(SESSION))),
    )

    await renewSession()
    expect(JSON.stringify({ ...localStorage })).not.toContain('token')
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('token')
  })
})
