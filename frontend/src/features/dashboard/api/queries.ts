import { useQuery } from '@tanstack/react-query'
import { getJson } from './client'
import type { Alert, DistrictSummary, Facility, LocatedReport, WeeklyCounts } from './types'

/**
 * How often the dashboard asks the API again. Reports arrive continuously and
 * the detector checks hourly; half a minute keeps a new report's dot and count
 * close to live without load worth measuring. Phase 5 replaces polling with a
 * WebSocket push for alerts.
 */
export const POLL_INTERVAL_MS = 30_000

/*
 * Polling pauses while the tab is hidden, and a returning tab refetches at
 * once, so a dashboard left open overnight does not poll into the void.
 */
const polling = {
  refetchInterval: POLL_INTERVAL_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: true,
} as const

/** Every district with its last seven days of reports and its open alerts. */
export function useDistricts() {
  return useQuery({
    queryKey: ['districts'],
    queryFn: ({ signal }) => getJson<DistrictSummary[]>('/districts', {}, signal),
    ...polling,
  })
}

/** The most recently detected alerts, for one district or the whole country. */
export function useAlerts(district: string | null) {
  return useQuery({
    queryKey: ['alerts', district],
    queryFn: ({ signal }) => getJson<Alert[]>('/alerts', { district, limit: 50 }, signal),
    ...polling,
  })
}

/** Located reports from the last seven days, for the map's dots. */
export function useLocatedReports(district: string | null) {
  return useQuery({
    queryKey: ['reports', 'locations', district],
    queryFn: ({ signal }) =>
      getJson<LocatedReport[]>('/reports/locations', { district, days: 7 }, signal),
    ...polling,
  })
}

/** Nine weeks of counts per symptom group, for the per-area chart. */
export function useWeeklyCounts(district: string | null) {
  return useQuery({
    queryKey: ['reports', 'weekly-counts', district],
    queryFn: ({ signal }) => getJson<WeeklyCounts>('/reports/weekly-counts', { district }, signal),
    ...polling,
  })
}

/**
 * A district's facilities, for the map's facility markers. The registry is
 * fixed by migration, so it is fetched once and never polled.
 */
export function useFacilities(district: string | null) {
  return useQuery({
    queryKey: ['facilities', district],
    queryFn: ({ signal }) => getJson<Facility[]>('/facilities', { district }, signal),
    enabled: district !== null,
    staleTime: Infinity,
  })
}
