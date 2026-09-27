import { type UseQueryResult } from '@tanstack/react-query'
import { useId } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { caps, cx, labelSm, tnum } from '@/styles/recipes'
import type { DistrictSummary } from './api/types'
import { formatCount } from './format'
import { districtPath } from './paths'
import { LoadingRows, QueryView } from './QueryView'

type DistrictListProps = {
  query: UseQueryResult<DistrictSummary[]>
  /** The district in view, or null for the whole country. */
  selected: string | null
}

/**
 * The dashboard's navigation: the whole country, then every district
 * alphabetically, each with its last seven days of reports and any open
 * alerts. The district in view is inked in and marked as the current page.
 */
export function DistrictList({ query, selected }: DistrictListProps) {
  return (
    <QueryView
      query={query}
      what="districts"
      loading={<LoadingRows label="Loading districts" rows={8} />}
    >
      {(districts) => {
        const total = districts.reduce((sum, district) => sum + district.reportsLast7Days, 0)
        const open = districts.reduce((sum, district) => sum + district.openAlerts, 0)
        return (
          <>
            <p
              aria-hidden="true"
              className={cx(labelSm, caps, 'flex justify-between pb-2xs text-ink-70')}
            >
              <span>District</span>
              <span>Reports · 7 days</span>
            </p>
            <ul className="border-t border-t-ink">
              <DistrictRow
                to={districtPath(null)}
                name="All of Sri Lanka"
                reports={total}
                openAlerts={open}
                current={selected === null}
              />
              {districts.map((district) => (
                <DistrictRow
                  key={district.code}
                  to={districtPath(district.code)}
                  name={district.name}
                  reports={district.reportsLast7Days}
                  openAlerts={district.openAlerts}
                  current={selected === district.code}
                />
              ))}
            </ul>
          </>
        )
      }}
    </QueryView>
  )
}

function DistrictRow({
  to,
  name,
  reports,
  openAlerts,
  current,
}: {
  to: string
  name: string
  reports: number
  openAlerts: number
  current: boolean
}) {
  const alerts =
    openAlerts === 0 ? '' : openAlerts === 1 ? ', 1 open alert' : `, ${openAlerts} open alerts`
  return (
    <li className="border-b border-b-ink-14">
      <Link
        to={to}
        aria-current={current ? 'page' : undefined}
        aria-label={`${name}, ${formatCount(reports)} reports in the last 7 days${alerts}`}
        className={cx(
          'grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-sm px-2xs py-[0.45rem] text-small no-underline',
          'transition-colors duration-(--dur-fast) ease-out',
          current ? 'bg-ink text-paper' : 'text-ink hover:bg-ink-04',
        )}
      >
        <span className="min-w-0">
          <span className={cx('block truncate', current && 'font-medium')}>{name}</span>
          {openAlerts > 0 ? (
            <span
              className={cx(
                labelSm,
                'mt-[0.1rem] flex items-center gap-[0.35rem]',
                current ? 'text-paper' : 'text-ink',
              )}
            >
              <span aria-hidden="true" className="inline-block size-[0.5rem] bg-alert" />
              {openAlerts === 1 ? '1 open alert' : `${openAlerts} open alerts`}
            </span>
          ) : null}
        </span>
        <span className={cx('font-mono text-label', tnum, current ? 'text-paper' : 'text-ink-70')}>
          {formatCount(reports)}
        </span>
      </Link>
    </li>
  )
}

/**
 * The same navigation as one labelled control, for screens too narrow to
 * carry the list beside the map.
 */
export function DistrictPicker({
  districts,
  selected,
}: {
  districts: DistrictSummary[]
  selected: string | null
}) {
  const navigate = useNavigate()
  const id = useId()
  return (
    <div className="grid gap-3xs">
      <label htmlFor={id} className={cx(labelSm, caps, 'text-ink-70')}>
        District
      </label>
      <select
        id={id}
        value={selected ?? ''}
        onChange={(event) => void navigate(districtPath(event.target.value || null))}
        className="w-full border border-ink-24 bg-paper-raised px-xs py-2xs text-small"
      >
        <option value="">All of Sri Lanka</option>
        {districts.map((district) => (
          <option key={district.code} value={district.code}>
            {district.name}
            {district.openAlerts > 0 ? ` (${district.openAlerts} open)` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
