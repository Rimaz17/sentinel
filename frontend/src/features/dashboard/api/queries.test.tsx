import { renderHook, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryWrapper } from '@/test/queryWrapper'
import { POLL_INTERVAL_MS, useAlerts, useDistricts, useFacilities } from './queries'

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn(() => Promise.resolve(Response.json([])))
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryWrapper>{children}</QueryWrapper>
}

function requestedUrls() {
  return fetchMock.mock.calls.map((call: unknown[]) => call[0])
}

describe('dashboard queries', () => {
  it('asks for one district when one is chosen, and the country otherwise', async () => {
    renderHook(() => useAlerts('KDY'), { wrapper })
    renderHook(() => useAlerts(null), { wrapper })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(requestedUrls()).toEqual(['/api/alerts?district=KDY&limit=50', '/api/alerts?limit=50'])
  })

  it('polls again every thirty seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderHook(() => useDistricts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
  })

  it('polls alerts while they are not pushed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderHook(() => useAlerts(null, false), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('does not poll alerts while they are pushed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { result } = renderHook(() => useAlerts(null, true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 3)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not fetch facilities until a district is chosen', async () => {
    renderHook(() => useFacilities(null), { wrapper })
    renderHook(() => useFacilities('KDY'), { wrapper })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(requestedUrls()).toEqual(['/api/facilities?district=KDY'])
  })
})
