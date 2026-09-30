import { useQuery } from '@tanstack/react-query'
import { ApiError, getJson } from '@/lib/api/client'
import type { Role } from '@/lib/api/session'

/** One of the four published demo accounts. */
export type DemoAccount = {
  role: Role
  email: string
  displayName: string
  /** An inspector's districts; `['*']` is every district. Empty for other roles. */
  districts: string[]
  /** The data provider's facility; null for other roles. */
  facilityName: string | null
}

/** GET /api/public/demo, which exists only while the API runs in demo mode. */
export type Demo = {
  accounts: DemoAccount[]
  /** The one password every demo account signs in with, published by design. */
  password: string
  invite: { code: string; facilityName: string; districtCode: string }
  /** When the demo is reset each night, as HH:mm in Sri Lanka time. */
  resetAt: string
}

/**
 * The public demonstration's accounts and invite code, or null when the API is
 * not in demo mode, which it says with a 404. The pages then show no demo panel
 * at all. Anything else that goes wrong also shows none: the panel is a help to
 * visitors, never something a page waits on.
 */
export function useDemo() {
  return useQuery({
    queryKey: ['demo'],
    queryFn: async ({ signal }) => {
      try {
        const demo = await getJson<Demo>('/public/demo', {}, signal)
        // The panel is optional; an answer not shaped like the demo must not take sign-in down.
        return Array.isArray(demo.accounts) ? demo : null
      } catch (caught) {
        if (caught instanceof ApiError && caught.status === 404) {
          return null
        }
        throw caught
      }
    },
    staleTime: Infinity,
    retry: false,
  })
}

/** Whether the signed-in account is the demo administrator, whose changes the API limits. */
export function isDemoAdministrator(demo: Demo | null | undefined, email: string): boolean {
  return (
    demo?.accounts.some((account) => account.role === 'ADMIN' && account.email === email) ?? false
  )
}

/** "03:00" as a visitor reads it: "3:00". */
export function resetTime(demo: Demo): string {
  return demo.resetAt.replace(/^0/, '')
}
