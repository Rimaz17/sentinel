import type { Alert, Cluster, SymptomGroup } from '../api/types'
import { formatCount, formatDecimal } from '../format'
import { SYMPTOM_GROUP_STYLES } from '../symptomGroups'

/** A cluster drawn on the map: the ring, and the alert it belongs to. */
export type MapRing = {
  key: string
  alertCode: string
  symptomGroup: SymptomGroup
  cluster: Cluster
}

/**
 * The rings to draw: the clusters of open alerts, in groups the reader has not
 * taken off the map. An ended alert's rings describe a week that has moved on,
 * so they are not drawn.
 */
export function ringsOf(alerts: Alert[], hidden: ReadonlySet<SymptomGroup>): MapRing[] {
  return alerts
    .filter((alert) => alert.open && !hidden.has(alert.symptomGroup))
    .flatMap((alert) =>
      alert.clusters.map((cluster, index) => ({
        key: `${alert.code}:${index}`,
        alertCode: alert.code,
        symptomGroup: alert.symptomGroup,
        cluster,
      })),
    )
}

/** "2 km", or "800 m" for a ring under a kilometre. */
export function formatDistance(metres: number): string {
  return metres >= 1000 ? `${formatDecimalTrimmed(metres / 1000)} km` : `${formatCount(metres)} m`
}

function formatDecimalTrimmed(value: number): string {
  return Number.isInteger(value) ? String(value) : formatDecimal(value)
}

/** "17 reports within 2 km from 7 facilities" */
export function clusterWords(cluster: Cluster): string {
  const reports = cluster.reportCount === 1 ? 'report' : 'reports'
  const facilities = cluster.facilityCount === 1 ? 'facility' : 'facilities'
  return (
    `${formatCount(cluster.reportCount)} ${reports} within ${formatDistance(cluster.radiusMetres)}` +
    ` from ${formatCount(cluster.facilityCount)} ${facilities}`
  )
}

/** "near Peradeniya", or null where the district has no located facility. */
export function nearWords(cluster: Cluster): string | null {
  return cluster.nearestFacilityName === null ? null : `near ${cluster.nearestFacilityName}`
}

/** "5.6 expected at its usual share" */
export function expectedWords(cluster: Cluster): string {
  return `${formatDecimal(cluster.expectedCount)} expected at its usual share`
}

/** What a ring says on hover, and in the map's key: the alert, the group, the cluster and where. */
export function ringLabel(ring: MapRing): string {
  const near = nearWords(ring.cluster)
  return [
    ring.alertCode,
    SYMPTOM_GROUP_STYLES[ring.symptomGroup].label,
    near === null ? clusterWords(ring.cluster) : `${clusterWords(ring.cluster)}, ${near}`,
  ].join(' · ')
}
