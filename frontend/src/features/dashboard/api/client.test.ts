import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiPath, getJson } from './client'

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
