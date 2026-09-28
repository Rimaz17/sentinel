/*
 * The signed-in session, held in memory only. The access token is never put in
 * localStorage or sessionStorage, where any script on the page could read it;
 * a reload recovers the session from the refresh cookie instead, which scripts
 * cannot read at all. See docs/adr/0011-accounts-tokens-and-district-scope.md.
 */

export type Role = 'DATA_PROVIDER' | 'PHI' | 'ADMIN'

/** The signed-in account, as /api/auth describes it. */
export type Account = {
  id: number
  email: string
  displayName: string
  role: Role
  /** An inspector's districts; `['*']` is every district. Empty for other roles. */
  districts: string[]
  /** A data provider's facility; null for other roles. */
  facility: { code: string; name: string; districtCode: string } | null
}

/** POST /api/auth/signin, /refresh, /register and /activate */
export type Session = {
  accessToken: string
  accessTokenExpiresAt: string
  account: Account
}

export type SessionState =
  { status: 'unknown' } | { status: 'signed-out' } | { status: 'signed-in'; session: Session }

let state: SessionState = { status: 'unknown' }
const listeners = new Set<() => void>()

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function sessionState(): SessionState {
  return state
}

export function setSession(session: Session | null) {
  state = session ? { status: 'signed-in', session } : { status: 'signed-out' }
  listeners.forEach((listener) => listener())
}

export function currentSession(): Session | null {
  return state.status === 'signed-in' ? state.session : null
}

/** Renewed this long before it expires, so a request never goes out on a dying token. */
const RENEW_MARGIN_MS = 30_000

export function needsRenewal(session: Session, now = Date.now()): boolean {
  return Date.parse(session.accessTokenExpiresAt) - now < RENEW_MARGIN_MS
}

/*
 * Two tabs opened together both send the same refresh cookie. The API refuses
 * the second quietly, and by then the first has set the new cookie, so one
 * retry after a moment succeeds.
 */
const RETRY_AFTER_MS = 400

let renewal: Promise<Session | null> | null = null

/**
 * Exchanges the refresh cookie for a new session. One renewal at a time: calls
 * made while one is on its way share it.
 */
export function renewSession(): Promise<Session | null> {
  renewal ??= renew().finally(() => {
    renewal = null
  })
  return renewal
}

async function renew(): Promise<Session | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_AFTER_MS))
    }
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { Accept: 'application/json' },
      })
      if (response.ok) {
        const session = (await response.json()) as Session
        setSession(session)
        return session
      }
      if (response.status !== 401) {
        break
      }
    } catch {
      break
    }
  }
  setSession(null)
  return null
}

/** For tests: forget everything, as a fresh page load would. */
export function resetSession() {
  state = { status: 'unknown' }
  renewal = null
  listeners.forEach((listener) => listener())
}
