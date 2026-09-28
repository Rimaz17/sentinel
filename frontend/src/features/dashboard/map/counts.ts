import type { LocatedReport, SymptomGroup } from '../api/types'

/** The most report positions the API returns for one map (ReportController.MAP_LIMIT). */
export const MAP_LIMIT = 5000

export function countByGroup(reports: LocatedReport[]): Record<SymptomGroup, number> {
  const counts: Record<SymptomGroup, number> = {
    DENGUE_LIKE: 0,
    INFLUENZA_LIKE: 0,
    GASTROINTESTINAL: 0,
    LEPTOSPIROSIS_LIKE: 0,
  }
  for (const report of reports) {
    counts[report.symptomGroup] += 1
  }
  return counts
}
