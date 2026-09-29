import { type UseQueryResult } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { caps, cx, labelSm, tnum } from '@/styles/recipes'
import type { DistrictSummary } from './api/types'
import { formatCount } from './format'
import { districtPath } from './paths'
import { LoadingRows, QueryView } from './QueryView'

export const ALL_OF_SRI_LANKA = 'All of Sri Lanka'

type DistrictListProps = {
  query: UseQueryResult<DistrictSummary[]>
  /** The first row, for every district the inspector covers. */
  allLabel?: string
  /** The district in view, or null for the whole country. */
  selected: string | null
}

/** More districts than this, and the list offers a search. */
export const SEARCH_FROM = 6

/**
 * The dashboard's navigation: the whole country, then every district
 * alphabetically, each with its last seven days of reports, a bar for that
 * week against the busiest district's, and any open alerts in words. The
 * district in view is marked as the current page. A national list of 25 can
 * be narrowed by name.
 */
export function DistrictList({ query, selected, allLabel = ALL_OF_SRI_LANKA }: DistrictListProps) {
  const [search, setSearch] = useState('')
  const searchId = useId()
  return (
    <QueryView
      query={query}
      what="districts"
      loading={<LoadingRows label="Loading districts" rows={8} />}
    >
      {(districts) => {
        const total = districts.reduce((sum, district) => sum + district.reportsLast7Days, 0)
        const open = districts.reduce((sum, district) => sum + district.openAlerts, 0)
        const busiest = Math.max(1, ...districts.map((district) => district.reportsLast7Days))
        const wanted = search.trim().toLowerCase()
        const shown = wanted
          ? districts.filter((district) => district.name.toLowerCase().includes(wanted))
          : districts
        return (
          <div className="grid gap-xs">
            {districts.length > SEARCH_FROM ? (
              <div>
                <label htmlFor={searchId} className="sr-only">
                  Find a district
                </label>
                <input
                  id={searchId}
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Find a district"
                  autoComplete="off"
                  className="w-full rounded-control border border-ink-24 bg-paper-raised px-xs py-2xs text-small"
                />
              </div>
            ) : null}
            <p
              aria-hidden="true"
              className={cx(
                labelSm,
                caps,
                'grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem] gap-x-sm px-2xs text-ink-70',
              )}
            >
              <span>District</span>
              <span className="col-span-2">Reports · 7 days</span>
            </p>
            <ul className="max-h-[26rem] overflow-y-auto border-t border-t-ink">
              <DistrictRow
                to={districtPath(null)}
                name={allLabel}
                reports={total}
                openAlerts={open}
                current={selected === null}
                share={null}
              />
              {shown.map((district) => (
                <DistrictRow
                  key={district.code}
                  to={districtPath(district.code)}
                  name={district.name}
                  reports={district.reportsLast7Days}
                  openAlerts={district.openAlerts}
                  current={selected === district.code}
                  share={district.reportsLast7Days / busiest}
                />
              ))}
            </ul>
            {wanted && shown.length === 0 ? (
              <p className="text-small text-ink-70">No district matches “{search.trim()}”.</p>
            ) : null}
          </div>
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
  share,
}: {
  to: string
  name: string
  reports: number
  openAlerts: number
  current: boolean
  /** This week against the busiest district's, from 0 to 1; null for the total row. */
  share: number | null
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
          'my-[0.2rem] grid grid-cols-[minmax(0,1fr)_3.5rem_4.5rem] items-center gap-x-sm rounded-control px-2xs py-[0.45rem] text-small text-ink no-underline',
          'transition-colors duration-(--dur-fast) ease-out',
          current ? 'bg-ink-08 font-medium' : 'hover:bg-ink-04',
        )}
      >
        <span className="min-w-0">
          <span className="block truncate">{name}</span>
          {openAlerts > 0 ? (
            <span className={cx(labelSm, 'mt-[0.1rem] flex items-center gap-[0.35rem] text-ink')}>
              <span aria-hidden="true" className="inline-block size-[0.5rem] bg-alert" />
              {openAlerts === 1 ? '1 open alert' : `${openAlerts} open alerts`}
            </span>
          ) : null}
        </span>
        <span
          className={cx(
            'text-end font-mono text-label',
            tnum,
            current ? 'text-ink' : 'text-ink-70',
          )}
        >
          {formatCount(reports)}
        </span>
        <span aria-hidden="true" className="block h-[0.4rem] rounded-full bg-ink-08">
          {share !== null ? (
            <span
              className="block h-full rounded-full bg-ink-70"
              style={{ width: `${Math.max(3, Math.round(share * 100))}%` }}
            />
          ) : null}
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
  allLabel = ALL_OF_SRI_LANKA,
}: {
  districts: DistrictSummary[]
  selected: string | null
  allLabel?: string
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
        <option value="">{allLabel}</option>
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
