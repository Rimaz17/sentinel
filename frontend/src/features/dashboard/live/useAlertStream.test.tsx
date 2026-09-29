import { act, renderHook, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetSession, type Session, setSession } from '@/lib/api/session'
import { FakeStompClient } from '@/test/fakeStomp'
import { alert, inspectorSession } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import { createTestQueryClient } from '@/test/testQueryClient'
import { ALERTS_DESTINATION } from './alertStream'
import { useAlertStream } from './useAlertStream'

const queryClient = createTestQueryClient()
let invalidated: unknown[][] = []

beforeEach(() => {
  resetSession()
  setSession(inspectorSession())
  invalidated = []
  vi.spyOn(queryClient, 'invalidateQueries').mockImplementation((filters) => {
    invalidated.push([...(filters?.queryKey ?? [])])
    return Promise.resolve()
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function wrapper({ children }: { children: ReactNode }) {
  return <QueryWrapper client={queryClient}>{children}</QueryWrapper>
}

async function openStream() {
  const hook = renderHook(() => useAlertStream(), { wrapper })
  const client = FakeStompClient.latest()
  await act(() => client.open())
  return { hook, client }
}

function event(change: string, body: object | null) {
  return JSON.stringify({ change, alert: body })
}

describe('useAlertStream', () => {
  it('connects to the socket on the page’s own origin, signed in with the page’s token', async () => {
    const { client } = await openStream()

    expect(client.config.brokerURL).toBe(`ws://${window.location.host}/api/ws`)
    expect(client.activate).toHaveBeenCalledOnce()
    expect(client.connectHeaders).toEqual({ Authorization: 'Bearer test-access-token' })
  })

  it('is connecting until the socket opens, then live', async () => {
    const hook = renderHook(() => useAlertStream(), { wrapper })
    expect(hook.result.current.status).toBe('connecting')

    await act(() => FakeStompClient.latest().open())

    expect(hook.result.current.status).toBe('live')
  })

  it('subscribes to its own queue of alert changes', async () => {
    const { client } = await openStream()

    expect([...client.subscriptions.keys()]).toEqual([ALERTS_DESTINATION])
  })

  it('reads the alerts and district counts afresh whenever it connects', async () => {
    await openStream()

    expect(invalidated).toEqual([['alerts'], ['districts']])
  })

  it('reads the alerts and district counts afresh on every change', async () => {
    const { client } = await openStream()
    invalidated = []

    act(() => {
      client.push(ALERTS_DESTINATION, event('UPDATED', alert({ status: 'ACKNOWLEDGED' })))
      client.push(ALERTS_DESTINATION, event('RESYNC', null))
    })

    expect(invalidated).toEqual([['alerts'], ['districts'], ['alerts'], ['districts']])
  })

  it('announces a raised alert, and nothing for a change or a resync', async () => {
    const { client, hook } = await openStream()

    act(() => client.push(ALERTS_DESTINATION, event('UPDATED', alert())))
    act(() => client.push(ALERTS_DESTINATION, event('RESYNC', null)))
    expect(hook.result.current.announcement).toBe('')

    act(() => client.push(ALERTS_DESTINATION, event('RAISED', alert({ code: 'A-1002' }))))
    expect(hook.result.current.announcement).toBe('New alert A-1002: Kandy, dengue-like.')
  })

  it('passes over a message it cannot read', async () => {
    const { client, hook } = await openStream()
    invalidated = []

    act(() => client.push(ALERTS_DESTINATION, 'not json'))

    expect(invalidated).toEqual([])
    expect(hook.result.current.status).toBe('live')
  })

  it('says it is reconnecting when the socket drops, and live when it is back', async () => {
    const { client, hook } = await openStream()

    act(() => client.drop())
    expect(hook.result.current.status).toBe('reconnecting')

    await act(() => client.open())
    expect(hook.result.current.status).toBe('live')
  })

  it('stays connecting while the socket has never opened', () => {
    const hook = renderHook(() => useAlertStream(), { wrapper })

    act(() => FakeStompClient.latest().drop())

    expect(hook.result.current.status).toBe('connecting')
  })

  it('reconnects with the new token whenever the page renews its own', async () => {
    const { client, hook } = await openStream()
    const renewed: Session = { ...inspectorSession(), accessToken: 'renewed-access-token' }

    act(() => setSession(renewed))
    await waitFor(() => expect(client.activate).toHaveBeenCalledTimes(2))
    expect(client.deactivate).toHaveBeenCalledOnce()
    // Carrying the token over is not a dropped socket.
    expect(hook.result.current.status).toBe('live')

    await act(() => client.open())
    expect(client.connectHeaders).toEqual({ Authorization: 'Bearer renewed-access-token' })
  })

  it('says it is reconnecting if the reconnection with a renewed token fails', async () => {
    const { client, hook } = await openStream()

    act(() => setSession({ ...inspectorSession(), accessToken: 'renewed-access-token' }))
    await waitFor(() => expect(client.activate).toHaveBeenCalledTimes(2))
    act(() => client.drop())

    expect(hook.result.current.status).toBe('reconnecting')
  })

  it('does not reconnect when the session is set again with the same token', async () => {
    const { client } = await openStream()

    act(() => setSession(inspectorSession()))

    expect(client.deactivate).not.toHaveBeenCalled()
  })

  it('renews a token about to expire before connecting with it', async () => {
    setSession({
      ...inspectorSession(),
      accessTokenExpiresAt: new Date(Date.now() + 10_000).toISOString(),
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          Response.json({ ...inspectorSession(), accessToken: 'renewed-access-token' }),
        ),
      ),
    )

    const { client } = await openStream()

    expect(client.connectHeaders).toEqual({ Authorization: 'Bearer renewed-access-token' })
  })

  it('stops when the inspector signs out', async () => {
    const { client } = await openStream()

    act(() => setSession(null))

    expect(client.deactivate).toHaveBeenCalledOnce()
    expect(client.active).toBe(false)
  })

  it('does not connect at all once nobody is signed in', async () => {
    const hook = renderHook(() => useAlertStream(), { wrapper })
    const client = FakeStompClient.latest()
    resetSession()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(null, { status: 401 }))))

    await act(() => client.open())

    expect(client.active).toBe(false)
    expect(hook.result.current.status).not.toBe('live')
  })

  it('closes the socket when the dashboard closes', async () => {
    const { client, hook } = await openStream()

    hook.unmount()

    expect(client.deactivate).toHaveBeenCalledOnce()
  })
})
