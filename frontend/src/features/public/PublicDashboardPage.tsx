import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'
import { SimulatedNotice } from '@/components/ui/SimulatedNotice'
import { WeeklyChart } from '@/features/dashboard/chart/WeeklyChart'
import { formatCount } from '@/features/dashboard/format'
import { LoadingRows, QueryView } from '@/features/dashboard/QueryView'
import { caps, cx, labelSm, sectionTitle, shell } from '@/styles/recipes'
import { usePublicAlerts, usePublicDistricts, usePublicTrends } from './api'
import { DistrictTable } from './DistrictTable'
import { DistrictMap } from './map/DistrictMap'
import { publicDistrictPath } from './paths'
import { PublicAlerts } from './PublicAlerts'

const panelTitle = 'text-section leading-snug font-medium tracking-tight'

/**
 * The public dashboard: the pattern, not the individuals. District status,
 * published alerts in plain words, and weekly trends, for the country or one
 * district. Geography is whole districts only; no report, facility or position
 * is shown, because none is in what the public API returns.
 */
export function PublicDashboardPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
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

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <SiteHeader />

      <main id="main" className={cx(shell, 'grid flex-1 content-start gap-2xl py-xl')}>
        <div className="grid max-w-measure gap-sm">
          <h1 className={sectionTitle}>Sri Lanka, district by district</h1>
          <p className="text-body-lg text-ink-70">
            Reports of four symptom patterns from hospitals and clinics, each district compared with
            its own usual level. Only district totals are shown here, never where a report came
            from.
          </p>
          <SimulatedNotice />
          <QueryView query={districts} what="district status" loading={null}>
            {(list) => (
              <StatusSummary elevated={list.filter((d) => d.status === 'ELEVATED').length} />
            )}
          </QueryView>
        </div>

        <section aria-labelledby="alerts-heading" className="grid max-w-measure gap-sm">
          <h2 id="alerts-heading" className={panelTitle}>
            Alerts
          </h2>
          <PublicAlerts query={alerts} />
        </section>

        <section aria-labelledby="districts-heading" className="grid gap-sm">
          <div className="grid gap-2xs">
            <h2 id="districts-heading" className={panelTitle}>
              Districts
            </h2>
            <p className="max-w-measure text-small text-ink-70">
              A district is shaded, with a heavier outline, while it has an active alert. Choose a
              district, on the map or in the table, to see its weekly reports.
            </p>
          </div>
          <QueryView
            query={districts}
            what="districts"
            loading={<LoadingRows label="Loading districts" rows={6} />}
          >
            {(list) => (
              <div className="grid gap-xl xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start">
                <div className="h-[26rem] border border-ink-14 md:h-[34rem]">
                  <DistrictMap
                    districts={list}
                    selected={selected}
                    onSelect={(code) => void navigate(publicDistrictPath(code))}
                  />
                </div>
                <DistrictTable districts={list} selected={selected} />
              </div>
            )}
          </QueryView>
        </section>

        <section aria-labelledby="trends-heading" className="grid gap-sm">
          <div className="grid gap-2xs">
            <h2 id="trends-heading" className={panelTitle}>
              Weekly reports, {areaName}
            </h2>
            <p className="max-w-measure text-small text-ink-70">
              Each symptom group’s last 7 days against the 8 weeks before. A report is a patient
              whose symptoms fit a pattern, not a confirmed diagnosis.
            </p>
            {selected ? (
              <p className={cx(labelSm, caps)}>
                <Link to={publicDistrictPath(null)} className="text-ink underline">
                  Back to all of Sri Lanka
                </Link>
              </p>
            ) : null}
          </div>
          <WeeklyChart query={trends} areaName={areaName} />
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}

function StatusSummary({ elevated }: { elevated: number }) {
  return (
    <p className="border-t border-t-ink pt-xs font-medium">
      {elevated === 0
        ? 'No district has elevated activity.'
        : elevated === 1
          ? '1 of 25 districts has elevated activity.'
          : `${formatCount(elevated)} of 25 districts have elevated activity.`}
    </p>
  )
}
