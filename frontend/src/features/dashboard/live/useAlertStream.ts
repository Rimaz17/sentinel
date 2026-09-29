import { Client } from '@stomp/stompjs'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { currentSession, needsRenewal, renewSession, subscribe } from '@/lib/api/session'
import {
  ALERTS_DESTINATION,
  announce,
  HEARTBEAT_MS,
  parseAlertEvent,
  RECONNECT_DELAY_MS,
  socketUrl,
} from './alertStream'

/**
 * Whether alerts are arriving by push: `connecting` until the socket first
 * opens, `live` while it is open, `reconnecting` after it drops. The alert
 * list polls whenever it is not `live`, so nothing is missed either way.
 */
export type LiveStatus = 'connecting' | 'live' | 'reconnecting'

export type AlertStream = {
  status: LiveStatus
  /** Words for a screen reader about the newest alert raised, or empty. */
  announcement: string
}

/**
 * Keeps the alert socket open while the dashboard is. Every change it hears
 * of refreshes the alert list and the district counts at once; so does every
 * connection, since changes made while it was closed were told to no one.
 *
 * The socket is signed in with the page's access token, and the API stops
 * pushing to it once that token expires. So whenever the page renews its
 * token, the socket reconnects with the new one.
 */
export function useAlertStream(): AlertStream {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    let disposed = false
    let signedInWith: string | null = null
    let renewing = false
    let opened = false

    const refresh = () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['districts'] }),
      ])

    const client = new Client({
      brokerURL: socketUrl(),
      reconnectDelay: RECONNECT_DELAY_MS,
      heartbeatIncoming: HEARTBEAT_MS,
      heartbeatOutgoing: HEARTBEAT_MS,
      beforeConnect: async () => {
        let session = currentSession()
        if (session && needsRenewal(session)) {
          session = await renewSession()
        }
        if (!session) {
          // Signed out meanwhile: stop rather than connect as nobody.
          await client.deactivate()
          return
        }
        signedInWith = session.accessToken
        client.connectHeaders = { Authorization: `Bearer ${session.accessToken}` }
      },
      onConnect: () => {
        opened = true
        setStatus('live')
        client.subscribe(ALERTS_DESTINATION, (message) => {
          const event = parseAlertEvent(message.body)
          if (event === null) {
            return
          }
          void refresh()
          if (event.change === 'RAISED') {
            setAnnouncement(announce(event.alert))
          }
        })
        void refresh()
      },
      onWebSocketClose: () => {
        if (renewing) {
          // The one close that carries a renewed token over is not a dropped
          // socket; any failure to reconnect after it is.
          renewing = false
          return
        }
        if (!disposed) {
          setStatus(opened ? 'reconnecting' : 'connecting')
        }
      },
    })
    client.activate()

    const stopWatching = subscribe(() => {
      const session = currentSession()
      if (session === null) {
        void client.deactivate()
      } else if (signedInWith !== null && session.accessToken !== signedInWith) {
        signedInWith = null
        renewing = true
        void client.deactivate().then(() => {
          if (!disposed) {
            client.activate()
          }
        })
      }
    })

    return () => {
      disposed = true
      stopWatching()
      void client.deactivate()
    }
  }, [queryClient])

  return { status, announcement }
}
