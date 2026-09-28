import type { Facility, LocatedReport } from '../api/types'
import { formatDateTime } from '../format'
import { SYMPTOM_GROUP_STYLES } from '../symptomGroups'

/** What a report dot says on hover: group, age band, facility and when. */
export function reportLabel(report: LocatedReport): string {
  return [
    SYMPTOM_GROUP_STYLES[report.symptomGroup].label,
    `age ${report.ageBand}`,
    report.facilityCode,
    formatDateTime(report.reportedAt),
  ].join(' · ')
}

/** What a facility ring says on hover. */
export function facilityLabel(facility: Facility): string {
  return `${facility.name} · ${facility.institutionType} · ${facility.code}`
}
