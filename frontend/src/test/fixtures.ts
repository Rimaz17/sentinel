import type {
  Alert,
  Cluster,
  DistrictSummary,
  LocatedReport,
  WeeklyCounts,
} from '@/features/dashboard/api/types'
import type { Demo } from '@/features/demo/api'
import type { Session } from '@/lib/api/session'

/*
 * API responses for component tests, shaped exactly as the API sends them.
 * The figures follow the project overview's worked example: Kandy's usual
 * dengue-like week is 25 reports, and 41 is 3.2σ above it.
 */

export const NOW = Date.parse('2026-09-28T08:30:00Z')

export function alert(overrides: Partial<Alert> = {}): Alert {
  return {
    code: 'A-1001',
    districtCode: 'KDY',
    districtName: 'Kandy',
    symptomGroup: 'DENGUE_LIKE',
    status: 'NEW',
    open: true,
    firstDetectedAt: '2026-09-28T04:00:00Z',
    lastDetectedAt: '2026-09-28T06:00:00Z',
    observedCount: 41,
    baselineMean: 25,
    baselineSd: 5,
    zScore: 3.2,
    peakZScore: 3.4,
    threshold: 3,
    verdict: null,
    verdictAt: null,
    published: false,
    clustersCheckedAt: '2026-09-28T06:00:00Z',
    clusters: [],
    ...overrides,
  }
}

/** Kandy's worked example: 17 of the week's 41 reports within 2 km, from 7 facilities. */
export function cluster(overrides: Partial<Cluster> = {}): Cluster {
  return {
    latitude: 7.291,
    longitude: 80.634,
    radiusMetres: 2000,
    reportCount: 17,
    facilityCount: 7,
    expectedCount: 5.61,
    nearestFacilityCode: 'LKY0001016',
    nearestFacilityName: 'Peradeniya',
    ...overrides,
  }
}

export function district(overrides: Partial<DistrictSummary> = {}): DistrictSummary {
  return {
    code: 'KDY',
    name: 'Kandy',
    province: 'Central',
    reportsLast7Days: 41,
    openAlerts: 1,
    ...overrides,
  }
}

export const DISTRICTS: DistrictSummary[] = [
  district({
    code: 'AMP',
    name: 'Ampara',
    province: 'Eastern',
    reportsLast7Days: 30,
    openAlerts: 0,
  }),
  district({
    code: 'CMB',
    name: 'Colombo',
    province: 'Western',
    reportsLast7Days: 212,
    openAlerts: 0,
  }),
  district(),
  district({ code: 'NEL', name: 'Nuwara Eliya', reportsLast7Days: 9, openAlerts: 0 }),
]

export function report(overrides: Partial<LocatedReport> = {}): LocatedReport {
  return {
    id: '5b0c0d8e-8f1b-4f59-9d5e-1c2a3b4c5d6e',
    facilityCode: 'LKY0001016',
    districtCode: 'KDY',
    symptomGroup: 'DENGUE_LIKE',
    ageBand: '30-39',
    latitude: 7.291,
    longitude: 80.634,
    reportedAt: '2026-09-28T07:40:00Z',
    receivedAt: '2026-09-28T07:41:00Z',
    ...overrides,
  }
}

/** Nine weeks of Kandy: a steady baseline of 25 dengue-like reports, then 41. */
export function weeklyCounts(districtCode: string | null = 'KDY'): WeeklyCounts {
  const end = Date.parse('2026-09-28T08:30:00Z')
  const week = 7 * 24 * 3600 * 1000
  const dengue = [22, 27, 25, 24, 28, 23, 26, 25, 41]
  return {
    districtCode,
    asOf: new Date(end).toISOString(),
    weeks: dengue.map((count, index) => ({
      start: new Date(end - (9 - index) * week).toISOString(),
      end: new Date(end - (8 - index) * week).toISOString(),
      counts: {
        DENGUE_LIKE: count,
        INFLUENZA_LIKE: 12,
        GASTROINTESTINAL: 8,
        LEPTOSPIROSIS_LIKE: 0,
      },
    })),
  }
}

/** A signed-in inspector, as /api/auth/refresh returns one. National unless given districts. */
export function inspectorSession(districts: string[] = ['*']): Session {
  return {
    accessToken: 'test-access-token',
    accessTokenExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    account: {
      id: 7,
      email: 'phi@example.org',
      displayName: 'Nimal Silva',
      role: 'PHI',
      districts,
      facility: null,
    },
  }
}

/** GET /api/public/demo, as the API answers it in demo mode. */
export const DEMO: Demo = {
  accounts: [
    {
      role: 'ADMIN',
      email: 'admin@demo.sentinel.test',
      displayName: 'Demo administrator',
      districts: [],
      facilityName: null,
    },
    {
      role: 'PHI',
      email: 'inspector.national@demo.sentinel.test',
      displayName: 'Demo inspector, every district',
      districts: ['*'],
      facilityName: null,
    },
    {
      role: 'PHI',
      email: 'inspector.colombo@demo.sentinel.test',
      displayName: 'Demo inspector, Colombo',
      districts: ['CMB'],
      facilityName: null,
    },
    {
      role: 'DATA_PROVIDER',
      email: 'records.idh@demo.sentinel.test',
      displayName: 'Demo records officer',
      districts: [],
      facilityName: 'Infectious Diseases Hospital, Angoda',
    },
  ],
  password: 'the right password',
  invite: {
    code: 'CMB-DEM-7Q4X',
    facilityName: 'Infectious Diseases Hospital, Angoda',
    districtCode: 'CMB',
  },
  resetAt: '03:00',
}
