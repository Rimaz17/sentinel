import { type UseQueryResult } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDay } from '@/features/dashboard/format'
import { EmptyState, LoadingRows, QueryView } from '@/features/dashboard/QueryView'
import { caps, cx, labelSm } from '@/styles/recipes'
import type { PublicAlert } from './api'
import { publicDistrictPath } from './paths'

const BASIS = {
  CONFIRMED: 'Confirmed by a public health inspector',
  THRESHOLD: 'Published because reports rose far above the usual level',
} as const

/**
 * Published alerts in the public's words: the district, the illness, and what
 * to do, with no counts or statistics. Active alerts first; those that have
 * ended stay listed for a season, under their own heading.
 */
export function PublicAlerts({
  query,
  errorWords,
}: {
  query: UseQueryResult<PublicAlert[]>
  errorWords: string
}) {
  return (
    <QueryView
      query={query}
      what="alerts"
      errorWords={errorWords}
      loading={<LoadingRows label="Loading alerts" rows={2} />}
    >
      {(alerts) => {
        const active = alerts.filter((alert) => alert.active)
        const ended = alerts.filter((alert) => !alert.active)
        return (
          <div className="grid gap-lg">
            {active.length === 0 ? (
              <EmptyState title="No district has an active alert.">
                An alert appears here once a public health inspector confirms a rise in reports, or
                when reports rise so far above a district’s usual level that it is published on that
                alone.
              </EmptyState>
            ) : (
              <ul className="border-t border-t-ink">
                {active.map((alert) => (
                  <AlertRow key={key(alert)} alert={alert} />
                ))}
              </ul>
            )}
            {ended.length > 0 ? (
              <details className="border-t border-t-ink-14 pt-xs">
                <summary
                  className={cx(labelSm, caps, 'cursor-pointer py-2xs text-ink-70 hover:text-ink')}
                >
                  Ended in the last 90 days · {ended.length}
                </summary>
                <ul className="mt-xs">
                  {ended.map((alert) => (
                    <AlertRow key={key(alert)} alert={alert} />
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        )
      }}
    </QueryView>
  )
}

function AlertRow({ alert }: { alert: PublicAlert }) {
  return (
    <li className="grid gap-3xs border-b border-b-ink-14 py-sm">
      {alert.active ? (
        <p className={cx(labelSm, caps, 'inline-flex items-center gap-[0.4rem] text-ink')}>
          <span aria-hidden="true" className="inline-block size-[0.6rem] bg-alert" />
          Active
        </p>
      ) : null}
      <p className="font-medium">
        <Link to={publicDistrictPath(alert.districtCode)} className="text-ink underline">
          {alert.headline}
        </Link>
      </p>
      <p className="text-small text-ink-70">
        {alert.active
          ? `Since ${formatDay(alert.since)}`
          : `${formatDay(alert.since)} to ${formatDay(alert.lastElevated)}`}
        . {BASIS[alert.basis]}.
      </p>
    </li>
  )
}

function key(alert: PublicAlert): string {
  return `${alert.districtCode}:${alert.symptomGroup}:${alert.since}`
}
