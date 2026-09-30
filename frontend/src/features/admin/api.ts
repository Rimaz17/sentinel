import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest, getJson } from '@/lib/api/client'
import type { Role } from '@/lib/api/session'

/** GET /api/admin/accounts */
export type AdminAccount = {
  id: number
  email: string
  displayName: string
  role: Role
  /** An inspector's districts; `['*']` for every district. */
  districts: string[]
  facilityCode: string | null
  facilityName: string | null
  enabled: boolean
  /** Whether the account has a password yet. */
  activated: boolean
  createdAt: string
  /** When its outstanding activation link expires; null if it has none. */
  activationExpiresAt: string | null
  /** Whether the demo administrator, asking, must leave this account as it is. */
  lockedInDemo: boolean
}

/** A new account or link, with the link's secret, shown to the administrator this once. */
export type IssuedAccount = {
  account: AdminAccount
  activationToken: string
  activationExpiresAt: string
}

/** GET /api/admin/facilities */
export type AdminFacility = {
  code: string
  name: string
  districtCode: string
  category: 'HOSPITAL' | 'MOH_OFFICE'
  institutionType: string
  /** When its current invite code was issued; null if it has none. */
  inviteIssuedAt: string | null
  dataProviderAccounts: number
  /** Whether the demo administrator, asking, must leave this facility's code as it is. */
  lockedInDemo: boolean
}

/** POST /api/admin/facilities/{code}/invite-code, shown this once. */
export type IssuedCode = { facilityCode: string; inviteCode: string; issuedAt: string }

/** GET /api/public/districts, the one open list of district names. */
export type DistrictName = { code: string; name: string }

export function useAccounts() {
  return useQuery({
    queryKey: ['admin', 'accounts'],
    queryFn: ({ signal }) => getJson<AdminAccount[]>('/admin/accounts', {}, signal),
  })
}

export function useFacilities(district: string) {
  return useQuery({
    queryKey: ['admin', 'facilities', district],
    queryFn: ({ signal }) => getJson<AdminFacility[]>('/admin/facilities', { district }, signal),
  })
}

/** District names for choosing an inspector's scope. They change only by migration. */
export function useDistrictNames() {
  return useQuery({
    queryKey: ['district-names'],
    queryFn: ({ signal }) => getJson<DistrictName[]>('/public/districts', {}, signal),
    staleTime: Infinity,
  })
}

/** Runs an administrative change, then reloads what it changed. */
function useAdminMutation<A, R>(fn: (arg: A) => Promise<R>, reload: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', reload] }),
  })
}

export function useCreateInspector() {
  return useAdminMutation(
    (inspector: { email: string; displayName: string; districts: string[] }) =>
      apiRequest<IssuedAccount>('/admin/inspectors', { method: 'POST', body: inspector }),
    'accounts',
  )
}

export function useChangeAccount() {
  return useAdminMutation(
    ({ id, enabled }: { id: number; enabled: boolean }) =>
      apiRequest<AdminAccount>(`/admin/accounts/${id}`, { method: 'PATCH', body: { enabled } }),
    'accounts',
  )
}

export function useNewLink() {
  return useAdminMutation(
    (id: number) =>
      apiRequest<IssuedAccount>(`/admin/accounts/${id}/activation`, { method: 'POST' }),
    'accounts',
  )
}

export function useIssueCode() {
  return useAdminMutation(
    (facilityCode: string) =>
      apiRequest<IssuedCode>(`/admin/facilities/${facilityCode}/invite-code`, { method: 'POST' }),
    'facilities',
  )
}

export function useRevokeCode() {
  return useAdminMutation(
    (facilityCode: string) =>
      apiRequest<void>(`/admin/facilities/${facilityCode}/invite-code`, { method: 'DELETE' }),
    'facilities',
  )
}
