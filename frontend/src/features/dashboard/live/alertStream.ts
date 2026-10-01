import type { Alert } from '../api/types'
import { groupLabel } from '../symptomGroups'

/*
 * The API's alert socket: STOMP over a WebSocket on the page's own origin,
 * which the dev and preview servers pass to the API like every other /api
 * request. See docs/adr/0016-alerts-pushed-over-websocket.md.
 */

export const SOCKET_PATH = '/api/ws'

/** Each connection's own queue of alert changes, the only subscription the API allows. */
export const ALERTS_DESTINATION = '/user/queue/alerts'

/** How long to wait before connecting again after the socket drops. */
export const RECONNECT_DELAY_MS = 5_000

/** As the API's broker: each side says it is alive every ten seconds. */
export const HEARTBEAT_MS = 10_000

/**
 * What the socket says: an alert was raised, or an alert changed; or, with no
 * alert, that changes may have been missed and every alert should be read
 * again.
 */
export type AlertEvent =
  { change: 'RAISED' | 'UPDATED'; alert: Alert } | { change: 'RESYNC'; alert: null }

/** The socket's address, ws: or wss: to match the page. */
export function socketUrl(location: Pick<Location, 'protocol' | 'host'> = window.location) {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${scheme}//${location.host}${SOCKET_PATH}`
}

/**
 * An event from a message body, or null for anything else. The API is the
 * only sender, so this checks the shape only far enough to act on it safely.
 */
export function parseAlertEvent(body: string): AlertEvent | null {
  let value: unknown
  try {
    value = JSON.parse(body)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null || !('change' in value)) {
    return null
  }
  const { change } = value
  const alert = 'alert' in value ? value.alert : null
  if (change === 'RESYNC') {
    return { change, alert: null }
  }
  if (
    (change === 'RAISED' || change === 'UPDATED') &&
    typeof alert === 'object' &&
    alert !== null &&
    'code' in alert
  ) {
    // The rest of the alert's shape is the API's own AlertResponse, as GET /api/alerts returns.
    return { change, alert: alert as Alert }
  }
  return null
}

/** What a screen reader is told when an alert is raised: "New alert A-1001: Kandy, dengue-like." */
export function announce(alert: Alert): string {
  return `New alert ${alert.code}: ${alert.districtName}, ${groupLabel(alert.symptomGroup).toLowerCase()}.`
}
