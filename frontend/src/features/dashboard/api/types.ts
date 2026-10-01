/*
 * The API's response shapes, exactly as the Spring Boot controllers serialise
 * them. Timestamps arrive as ISO 8601 strings in UTC; decimals arrive as JSON
 * numbers.
 */

export const SYMPTOM_GROUPS = [
  'DENGUE_LIKE',
  'INFLUENZA_LIKE',
  'GASTROINTESTINAL',
  'LEPTOSPIROSIS_LIKE',
] as const

export type SymptomGroup = (typeof SYMPTOM_GROUPS)[number]

export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'CLOSED'

/** An inspector's final judgement of an alert. */
export type Verdict = 'CONFIRMED' | 'FALSE_ALARM'

/** GET /api/districts */
export type DistrictSummary = {
  code: string
  name: string
  province: string
  reportsLast7Days: number
  openAlerts: number
}

/** GET /api/alerts */
export type Alert = {
  code: string
  districtCode: string
  districtName: string
  symptomGroup: SymptomGroup
  status: AlertStatus
  /** Not closed, and last detected within the detector's 24-hour episode gap. */
  open: boolean
  firstDetectedAt: string
  lastDetectedAt: string
  observedCount: number
  baselineMean: number
  baselineSd: number
  zScore: number
  peakZScore: number
  threshold: number
  /** Null until an inspector gives one. */
  verdict: Verdict | null
  verdictAt: string | null
  /** Whether the public dashboard shows it: confirmed, or unjudged past the higher threshold. */
  published: boolean
  /** When the geographic check last looked at its reports; null if it never has. */
  clustersCheckedAt: string | null
  /** Where its reports are bunched, the most reports first; empty if nowhere. */
  clusters: Cluster[]
}

/**
 * A place an alert's reports are bunched, as the detector's geographic check
 * found it: a ring around a centre rounded to about 100 m, what the ring held
 * this week, and what it would have held had it kept its usual share.
 */
export type Cluster = {
  latitude: number
  longitude: number
  radiusMetres: number
  reportCount: number
  facilityCount: number
  expectedCount: number
  /** Null, with the name, when the alert's district has no located facility. */
  nearestFacilityCode: string | null
  nearestFacilityName: string | null
}

/** GET /api/reports/locations */
export type LocatedReport = {
  id: string
  facilityCode: string
  districtCode: string
  symptomGroup: SymptomGroup
  ageBand: string
  latitude: number
  longitude: number
  reportedAt: string
  receivedAt: string
}

/** GET /api/reports/weekly-counts */
export type WeeklyCounts = {
  /** Null for the whole country. */
  districtCode: string | null
  asOf: string
  /** Oldest first; the last is the current seven days. */
  weeks: {
    start: string
    end: string
    counts: Record<SymptomGroup, number>
  }[]
}

/** GET /api/facilities */
export type Facility = {
  code: string
  name: string
  districtCode: string
  category: 'HOSPITAL' | 'MOH_OFFICE'
  institutionType: string
  /** Null where the registry could not verify a location. */
  latitude: number | null
  longitude: number | null
}
