import { useQuery } from '@tanstack/react-query'
import type { SymptomGroup, WeeklyCounts } from '@/features/dashboard/api/types'
import { getJson } from '@/lib/api/client'

/*
 * The public API's shapes. Everything here is district-level: there is no
 * field for a report's position, a facility, or an alert's internal figures,
 * because the API never sends one.
 */

export type DistrictStatus = 'USUAL' | 'ELEVATED'

/** GET /api/public/districts */
export type PublicDistrict = {
  code: string
  name: string
  province: string
  status: DistrictStatus
  /** Symptom groups with an active published alert. */
  elevatedGroups: SymptomGroup[]
  reportsLast7Days: number
}

/** GET /api/public/alerts */
export type PublicAlert = {
  districtCode: string
  districtName: string
  symptomGroup: SymptomGroup
  active: boolean
  /** Days in Sri Lanka, yyyy-mm-dd. */
  since: string
  lastElevated: string
  /** An inspector confirmed it, or it ran far enough above usual to publish on its own. */
  basis: 'CONFIRMED' | 'THRESHOLD'
  headline: string
}

/**
 * The API lets the public endpoints be cached for a minute, so asking more
 * often would only fetch the same answer.
 */
export const PUBLIC_POLL_MS = 60_000

const polling = {
  refetchInterval: PUBLIC_POLL_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
} as const

export function usePublicDistricts() {
  return useQuery({
    queryKey: ['public', 'districts'],
    queryFn: ({ signal }) => getJson<PublicDistrict[]>('/public/districts', {}, signal),
    ...polling,
  })
}

export function usePublicAlerts() {
  return useQuery({
    queryKey: ['public', 'alerts'],
    queryFn: ({ signal }) => getJson<PublicAlert[]>('/public/alerts', {}, signal),
    ...polling,
  })
}

/** Nine weeks per symptom group, the same shape the internal chart reads. */
export function usePublicTrends(district: string | null) {
  return useQuery({
    queryKey: ['public', 'trends', district],
    queryFn: ({ signal }) => getJson<WeeklyCounts>('/public/trends', { district }, signal),
    ...polling,
  })
}
