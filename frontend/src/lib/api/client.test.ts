import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiPath, apiRequest, getJson } from './client'
import { resetSession, type Session, sessionState, setSession } from './session'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFetch(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('apiPath', () => {
  it('prefixes the path with /api', () => {
    expect(apiPath('/districts')).toBe('/api/districts')
  })

  it('adds query parameters and leaves out empty ones', () => {
    expect(apiPath('/alerts', { district: 'KDY', limit: 50, status: null, x: undefined })).toBe(
      '/api/alerts?district=KDY&limit=50',
    )
  })
})

describe('getJson', () => {
  it('returns the parsed body of a successful response', async () => {
    const fetchMock = stubFetch(Response.json([{ code: 'KDY' }]))

    await expect(getJson('/districts')).resolves.toEqual([{ code: 'KDY' }])
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/districts',
      expect.objectContaining({ headers: { Accept: 'application/json' } }),
    )
  })

  it("carries a problem response's detail and status", async () => {
    stubFetch(
      Response.json(
        { type: 'about:blank', status: 400, detail: 'Invalid request parameters.' },
        { status: 400 },
      ),
    )

    const error = await getJson('/alerts').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 400, message: 'Invalid request parameters.' })
  })

  it('names the status when an error response is not a problem', async () => {
    stubFetch(new Response('<html>Server error</html>', { status: 500 }))

    await expect(getJson('/alerts')).rejects.toThrow('The API answered 500.')
  })

  it.each([502, 503, 504])(
    'reads a bare %i from the proxy as the API not being reached',
    async (status) => {
      stubFetch(new Response('', { status }))

      await expect(getJson('/alerts')).rejects.toMatchObject({
        status,
        message: 'The API could not be reached. Check that it is running.',
      })
    },
  )

  it('says the API could not be reached when the request itself fails', async () => {
    stubFetch(new TypeError('Failed to fetch'))

    await expect(getJson('/alerts')).rejects.toMatchObject({
      status: 0,
      message: 'The API could not be reached. Check that it is running.',
    })
  })
})

describe('apiRequest', () => {
  beforeEach(() => {
    resetSession()
  })

  it('sends a body as JSON and reads a reply with none', async () => {
    const fetchMock = stubFetch(new Response(null, { status: 204 }))

    await expect(
      apiRequest('/admin/accounts/3', { method: 'PATCH', body: { enabled: false } }),
    ).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/accounts/3',
      expect.objectContaining({
        method: 'PATCH',
        body: '{"enabled":false}',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      }),
    )
  })

  it('keeps the fields a refused form names', async () => {
    stubFetch(
      Response.json(
        {
          status: 400,
          detail: 'The request has invalid fields.',
          errors: [{ field: 'password', message: 'must be at least 12 characters' }],
        },
        { status: 400 },
      ),
    )

    const error = (await apiRequest('/auth/register', { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    )) as ApiError
    expect(error.problemWith('password')).toBe('must be at least 12 characters')
    expect(error.problemWith('email')).toBeUndefined()
  })

  it('sends the signed-in person’s token', async () => {
    setSession(session('first-token'))
    const fetchMock = stubFetch(Response.json([]))

    await getJson('/alerts')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/alerts',
      expect.objectContaining({
        headers: { Accept: 'application/json', Authorization: 'Bearer first-token' },
      }),
    )
  })

  it('renews a refused token once and sends the request again', async () => {
    setSession(session('stale-token'))
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (url === '/api/auth/refresh') {
        return Promise.resolve(Response.json(session('fresh-token')))
      }
      const auth = (init?.headers as Record<string, string>).Authorization
      return Promise.resolve(
        auth === 'Bearer fresh-token'
          ? Response.json(['ok'])
          : Response.json({ detail: 'expired' }, { status: 401 }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(getJson('/alerts')).resolves.toEqual(['ok'])
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/alerts',
      '/api/auth/refresh',
      '/api/alerts',
    ])
  })

  it('renews a token about to expire before using it', async () => {
    setSession(session('dying-token', Date.now() + 5_000))
    const fetchMock = vi.fn((url: string) =>
      Promise.resolve(
        url === '/api/auth/refresh' ? Response.json(session('fresh-token')) : Response.json([]),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await getJson('/alerts')
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/auth/refresh', '/api/alerts'])
  })

  it('signs out when the session cannot be renewed', async () => {
    setSession(session('stale-token'))
    stubFetch(Response.json({ detail: 'Not signed in.' }, { status: 401 }))

    await expect(getJson('/alerts')).rejects.toMatchObject({ status: 401 })
    expect(sessionState().status).toBe('signed-out')
  })
})

function session(accessToken: string, expiresAt = Date.now() + 15 * 60_000): Session {
  return {
    accessToken,
    accessTokenExpiresAt: new Date(expiresAt).toISOString(),
    account: {
      id: 1,
      email: 'phi@example.org',
      displayName: 'Nimal Silva',
      role: 'PHI',
      districts: ['KDY'],
      facility: null,
    },
  }
}
