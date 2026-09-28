import { type QueryClient } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'
import { apiRequest } from '@/lib/api/client'
import {
  type Role,
  renewSession,
  type Session,
  type SessionState,
  sessionState,
  setSession,
  subscribe,
} from '@/lib/api/session'

/**
 * The signed-in session, recovered from the refresh cookie the first time a
 * page asks for it. Only staff pages ask, so the landing page and the public
 * dashboard never make the request.
 */
export function useSession(): SessionState {
  const state = useSyncExternalStore(subscribe, sessionState)
  useEffect(() => {
    if (state.status === 'unknown') {
      void renewSession()
    }
  }, [state.status])
  return state
}

/** Where each role works. */
export function homeFor(role: Role): string {
  switch (role) {
    case 'PHI':
      return '/app'
    case 'ADMIN':
      return '/app/admin'
    case 'DATA_PROVIDER':
      return '/submit'
  }
}

/** What each role is called where a person reads it. */
export const ROLE_NAMES: Record<Role, string> = {
  PHI: 'public health inspector',
  ADMIN: 'administrator',
  DATA_PROVIDER: 'data provider',
}

/** Starts a session from an API response that created one. */
export function startSession(session: Session) {
  setSession(session)
}

/**
 * Ends the session here and on the API, and forgets every cached response, so
 * nothing the last person could see is shown to whoever signs in next.
 */
export async function signOut(queryClient: QueryClient) {
  try {
    await apiRequest('/auth/signout', { method: 'POST' })
  } catch {
    // Signed out here regardless: the cookie expires on its own.
  }
  setSession(null)
  queryClient.clear()
}
