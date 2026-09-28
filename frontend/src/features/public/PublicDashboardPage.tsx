import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'
import { SimulatedNotice } from '@/components/ui/SimulatedNotice'
import { WeeklyChart } from '@/features/dashboard/chart/WeeklyChart'
import { formatClock, formatCount, formatDay } from '@/features/dashboard/format'
import { LoadingRows, QueryView } from '@/features/dashboard/QueryView'
import { caps, cx, labelSm, sectionTitle, shell } from '@/styles/recipes'
import {
  type PublicAlert,
  type PublicDistrict,
  usePublicAlerts,
  usePublicDistricts,
  usePublicTrends,
} from './api'
import { DistrictTable } from './DistrictTable'
import { publicDistrictPath } from './paths'
import { PublicAlerts } from './PublicAlerts'

/*
 * The map, with Leaflet and the district outlines, is the heaviest thing on
 * the page and the only part that says nothing the text does not. It loads
 * after everything else, so a phone on a slow connection reads the status,
 * the alerts and the table first.
 */
const DistrictMap = lazy(() =>
  import('./map/DistrictMap').then((module) => ({ default: module.DistrictMap })),
)

const panelTitle = 'text-section leading-snug font-medium tracking-tight'

/** What the public is told when figures cannot be fetched: something they can act on. */
export const PUBLIC_ERROR = 'The figures are unavailable at the moment. Try again in a minute.'

const MAP_HEIGHT = 'h-[22rem] md:h-[34rem]'

/**
 * The public dashboard: the pattern, not the individuals. A visitor's question
 * is whether anything unusual is happening where they live, so the page leads
 * with a district picker and, once one is chosen, answers for that district
 * before anything else. Geography is whole districts only; no report, facility
 * or position is shown, because none is in what the public API returns.
 */
export function PublicDashboardPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  // The address the page opened at. A district chosen after it, from the picker, the
  // map or the table, moves focus to that district's answer; a shared link does not.
  const [openedAt] = useState(location.key)
  const chosenHere = location.key !== openedAt
  const requested = params.get('district')?.toUpperCase() ?? null

  const districts = usePublicDistricts()
  const alerts = usePublicAlerts()
  const district =
    requested === null ? undefined : districts.data?.find((d) => d.code === requested)
  // An unknown code is ignored rather than sent to the API: the page shows the country.
  const selected = district ? district.code : null
  const trends = usePublicTrends(selected)
  const areaName = district?.name ?? 'all of Sri Lanka'

  useEffect(() => {
    document.title = district
      ? `${district.name} · Public dashboard · Sentinel`
      : 'Public dashboard · Sentinel'
  }, [district])

  function choose(code: string | null) {
    void navigate(publicDistrictPath(code))
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <SiteHeader />

      <main id="main" className={cx(shell, 'grid flex-1 content-start gap-2xl py-xl')}>
        <div className="grid gap-lg xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-2xl">
          <div className="grid content-start gap-sm">
            <h1 className={cx(sectionTitle, 'max-w-[22ch]')}>Sri Lanka, district by district</h1>
            <p className="max-w-measure text-body-lg text-ink-70">
              Reports of four symptom patterns from hospitals and clinics, each district compared
              with its own usual level. Only district totals are shown here, never where a report
              came from.
            </p>
            <SimulatedNotice />
          </div>

          <div className="grid content-start gap-md">
            <QueryView
              query={districts}
              what="district status"
              errorWords={PUBLIC_ERROR}
              loading={<LoadingRows label="Checking district status" rows={1} />}
            >
              {(list) => (
                <div className="grid gap-md">
                  <div className="grid gap-3xs border-t border-t-ink pt-xs">
                    <StatusSummary elevated={list.filter((d) => d.status === 'ELEVATED').length} />
                    <p className={cx(labelSm, 'text-ink-70')}>
                      Updated{' '}
                      <time dateTime={new Date(districts.dataUpdatedAt).toISOString()}>
                        {formatClock(districts.dataUpdatedAt)}
                      </time>{' '}
                      Sri Lanka time · refreshed every minute
                    </p>
                  </div>
                  <DistrictPicker districts={list} selected={selected} onChoose={choose} />
                </div>
              )}
            </QueryView>
            {district ? (
              <DistrictStatus
                district={district}
                takeFocus={chosenHere}
                alerts={(alerts.data ?? []).filter(
                  (alert) => alert.active && alert.districtCode === district.code,
                )}
              />
            ) : null}
          </div>
        </div>

        <section aria-labelledby="alerts-heading" className="grid max-w-measure gap-sm">
          <h2 id="alerts-heading" className={panelTitle}>
            Alerts
          </h2>
          <PublicAlerts query={alerts} errorWords={PUBLIC_ERROR} />
        </section>

        <section aria-labelledby="districts-heading" className="grid gap-sm">
          <div className="grid gap-2xs">
            <h2 id="districts-heading" className={panelTitle}>
              Every district
            </h2>
            <p className="max-w-measure text-small text-ink-70">
              A district is shaded, with a heavier outline, while it has an active alert. Each
              district’s reports are compared with its own usual week, never with another
              district’s: Colombo’s usual week is several times Kandy’s.
            </p>
          </div>
          <QueryView
            query={districts}
            what="districts"
            errorWords={PUBLIC_ERROR}
            loading={<LoadingRows label="Loading districts" rows={6} />}
          >
            {(list) => (
              <div className="grid gap-xl xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
                <Suspense
                  fallback={<div aria-hidden="true" className={cx(MAP_HEIGHT, 'bg-paper-sunk')} />}
                >
                  <DistrictMap
                    districts={list}
                    selected={selected}
                    onSelect={choose}
                    className={MAP_HEIGHT}
                  />
                </Suspense>
                <DistrictTable districts={list} selected={selected} />
              </div>
            )}
          </QueryView>
        </section>

        <section aria-labelledby="trends-heading" className="grid gap-sm">
          <div className="grid gap-2xs">
            <h2 id="trends-heading" tabIndex={-1} className={panelTitle}>
              Weekly reports, {areaName}
            </h2>
            <p className="max-w-measure text-small text-ink-70">
              Each symptom group’s last 7 days against the 8 weeks before. A report is a patient
              whose symptoms fit a pattern, not a confirmed diagnosis.
            </p>
          </div>
          <WeeklyChart query={trends} areaName={areaName} errorWords={PUBLIC_ERROR} />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function StatusSummary({ elevated }: { elevated: number }) {
  return (
    <p className="font-medium">
      {elevated === 0
        ? 'No district has elevated activity.'
        : elevated === 1
          ? '1 of 25 districts has elevated activity.'
          : `${formatCount(elevated)} of 25 districts have elevated activity.`}
    </p>
  )
}

/** The question most visitors came with: what about my district? */
function DistrictPicker({
  districts,
  selected,
  onChoose,
}: {
  districts: PublicDistrict[]
  selected: string | null
  onChoose: (code: string | null) => void
}) {
  const id = useId()
  const sorted = [...districts].sort((a, b) => a.name.localeCompare(b.name))
  return (
    <div className="grid gap-3xs">
      <label htmlFor={id} className={cx(labelSm, caps, 'text-ink-70')}>
        Your district
      </label>
      <select
        id={id}
        value={selected ?? ''}
        onChange={(event) => onChoose(event.target.value || null)}
        className="w-full max-w-[22rem] border border-ink-24 bg-paper-raised px-xs py-xs text-body"
      >
        <option value="">All of Sri Lanka</option>
        {sorted.map((district) => (
          <option key={district.code} value={district.code}>
            {district.name}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * The chosen district's answer, in one sentence. Focus moves here when a
 * district is chosen, so a keyboard or screen reader user hears the answer and
 * a phone user sees it without scrolling back up to find what changed.
 */
function DistrictStatus({
  district,
  alerts,
  takeFocus,
}: {
  district: PublicDistrict
  alerts: PublicAlert[]
  takeFocus: boolean
}) {
  const ref = useRef<HTMLElement>(null)
  const code = district.code

  useEffect(() => {
    if (takeFocus) {
      ref.current?.focus()
      ref.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [code, takeFocus])

  const elevated = district.status === 'ELEVATED'
  return (
    <section
      ref={ref}
      tabIndex={-1}
      aria-labelledby="district-status-heading"
      className="grid gap-2xs border-t border-t-ink pt-xs"
    >
      <h2 id="district-status-heading" className={panelTitle}>
        {district.name}
      </h2>
      {elevated ? (
        <>
          <p className="inline-flex items-center gap-[0.4rem] font-medium">
            <span aria-hidden="true" className="inline-block size-[0.6rem] bg-alert" />
            Elevated activity
          </p>
          <ul className="grid gap-3xs text-body">
            {alerts.map((alert) => (
              <li key={`${alert.symptomGroup}:${alert.since}`}>
                {alert.headline}{' '}
                <span className="text-ink-70">Since {formatDay(alert.since)}.</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-body">
          Usual activity. No alert is active for {district.name} district.
        </p>
      )}
      <p className="flex flex-wrap gap-x-md text-small">
        <a href="#trends-heading" className="text-ink underline">
          Its weekly reports
        </a>
        <Link to={publicDistrictPath(null)} className="text-ink underline">
          Back to all of Sri Lanka
        </Link>
      </p>
    </section>
  )
}
