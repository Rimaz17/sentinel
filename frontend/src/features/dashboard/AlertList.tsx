import { type UseQueryResult } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { caps, cx, labelSm, tnum } from '@/styles/recipes'
import { AlertActions } from './AlertActions'
import type { Alert } from './api/types'
import { formatAgo, formatDateTime, formatDecimal, formatSigma } from './format'
import { clusterWords, expectedWords, nearWords } from './map/rings'
import { districtPath } from './paths'
import { publicationWords } from './publication'
import { EmptyState, LoadingRows, QueryView } from './QueryView'
import { SYMPTOM_GROUP_STYLES } from './symptomGroups'

type AlertListProps = {
  query: UseQueryResult<Alert[]>
  /** The district in view, or null for the whole country. */
  districtName: string | null
  /** The moment "2 h ago" is measured from. */
  now: number
}

/**
 * The alert queue, most recently detected first. Wording is the internal,
 * technical register: "A-1001, 41 reports, 3.2σ above baseline, cluster
 * confirmed across 7 facilities".
 */
export function AlertList({ query, districtName, now }: AlertListProps) {
  return (
    <QueryView
      query={query}
      what="alerts"
      loading={<LoadingRows label="Loading alerts" rows={3} />}
      isEmpty={(alerts) => alerts.length === 0}
      empty={
        <EmptyState title={districtName ? `No alerts for ${districtName}.` : 'No alerts yet.'}>
          The detector checks every hour, comparing each district’s last 7 days with its previous 8
          weeks, and raises an alert when a symptom group runs more than 3σ above that baseline.
        </EmptyState>
      }
    >
      {(alerts) => (
        <ol className="border-t border-t-ink">
          {alerts.map((alert) => (
            <li key={alert.code}>
              <AlertItem alert={alert} now={now} linkDistrict={districtName === null} />
            </li>
          ))}
        </ol>
      )}
    </QueryView>
  )
}

function AlertItem({
  alert,
  now,
  linkDistrict,
}: {
  alert: Alert
  now: number
  linkDistrict: boolean
}) {
  const group = SYMPTOM_GROUP_STYLES[alert.symptomGroup]
  const headingId = `alert-${alert.code}`

  return (
    <article aria-labelledby={headingId} className="grid gap-2xs border-b border-b-ink-14 py-sm">
      <div className="flex items-baseline gap-xs">
        <AlertState alert={alert} />
        <h3 id={headingId} className={cx('font-mono text-label font-medium text-ink', tnum)}>
          {alert.code}
        </h3>
        <p className={cx(labelSm, 'ms-auto text-ink-70')}>
          <time dateTime={alert.lastDetectedAt} title={formatDateTime(alert.lastDetectedAt)}>
            {formatAgo(alert.lastDetectedAt, now)}
          </time>
        </p>
      </div>

      <p className="flex flex-wrap items-center gap-x-xs text-small">
        {linkDistrict ? (
          <Link to={districtPath(alert.districtCode)} className="font-medium text-ink underline">
            {alert.districtName}
          </Link>
        ) : (
          <span className="font-medium">{alert.districtName}</span>
        )}
        <span aria-hidden="true" className="text-ink-40">
          ·
        </span>
        <span className="inline-flex items-center gap-[0.4rem]">
          <span aria-hidden="true" className={cx('inline-block size-[0.55rem]', group.swatch)} />
          {group.label}
        </span>
      </p>

      <p className="text-small">
        <span className="font-medium">{alert.observedCount} reports</span>,{' '}
        {formatSigma(alert.zScore)} above baseline
        {alert.clusters[0] ? (
          <>, cluster confirmed across {alert.clusters[0].facilityCount} facilities</>
        ) : null}
      </p>

      <dl className={cx(labelSm, 'grid grid-cols-[auto_1fr] gap-x-sm text-ink-70')}>
        <dt>Baseline</dt>
        <dd>
          {formatDecimal(alert.baselineMean)} a week, sd {formatDecimal(alert.baselineSd)}
        </dd>
        <dt>Peak</dt>
        <dd>
          {formatSigma(alert.peakZScore)}, threshold {formatSigma(alert.threshold)}
        </dd>
        <dt>Where</dt>
        <dd>
          <Where alert={alert} />
        </dd>
        <dt>Detected</dt>
        <dd>
          {formatDateTime(alert.firstDetectedAt)} to {formatDateTime(alert.lastDetectedAt)}
        </dd>
        <dt>Public</dt>
        <dd>{publicationWords(alert)}</dd>
      </dl>

      <AlertActions alert={alert} />
    </article>
  )
}

/**
 * Where the alert's reports are, from the geographic check: each cluster on a
 * line of its own, or that they are spread out, or that the check has not
 * looked yet, which is not the same as having found nothing.
 */
function Where({ alert }: { alert: Alert }) {
  if (alert.clustersCheckedAt === null) {
    return <>Not checked for clusters</>
  }
  if (alert.clusters.length === 0) {
    return <>No cluster: not bunched in any one place</>
  }
  return (
    <ul>
      {alert.clusters.map((cluster) => {
        const near = nearWords(cluster)
        return (
          <li key={`${cluster.latitude},${cluster.longitude}`}>
            {clusterWords(cluster)}
            {near === null ? '' : `, ${near}`}; {expectedWords(cluster)}
          </li>
        )
      })}
    </ul>
  )
}

const STATUS_WORDS: Record<Alert['status'], string> = {
  NEW: 'New',
  ACKNOWLEDGED: 'Acknowledged',
  INVESTIGATING: 'Investigating',
  CLOSED: 'Closed',
}

/**
 * Whether the episode is still open, in words beside a mark: red and filled
 * while open, hollow once it has ended. The words carry the meaning; the
 * colour only repeats it.
 */
function AlertState({ alert }: { alert: Alert }) {
  const word = alert.open ? 'Open' : alert.status === 'CLOSED' ? 'Closed' : 'Ended'
  return (
    <p className={cx(labelSm, caps, 'inline-flex items-center gap-[0.4rem] text-ink')}>
      <span
        aria-hidden="true"
        className={cx(
          'inline-block size-[0.6rem] border',
          alert.open ? 'border-alert bg-alert' : 'border-ink-40 bg-transparent',
        )}
      />
      {word}
      {alert.status !== 'CLOSED' ? (
        <span className="text-ink-70"> · {STATUS_WORDS[alert.status]}</span>
      ) : null}
    </p>
  )
}
