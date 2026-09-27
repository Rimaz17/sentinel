import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SkipLink } from '@/components/layout/SkipLink'
import { caps, cx, labelSm, sectionTitle, shell } from '@/styles/recipes'
import {
  useAlerts,
  useDistricts,
  useFacilities,
  useLocatedReports,
  useWeeklyCounts,
} from './api/queries'
import type { SymptomGroup } from './api/types'
import { AlertList } from './AlertList'
import { WeeklyChart } from './chart/WeeklyChart'
import { DashboardHeader } from './DashboardHeader'
import { DistrictList, DistrictPicker } from './DistrictList'
import { formatCount } from './format'
import { boundsOf, SRI_LANKA } from './map/geometry'
import { MapKey } from './map/MapKey'
import { ReportMap } from './map/ReportMap'
import { LoadingRows, QueryView } from './QueryView'

const panelTitle = 'text-section leading-snug font-medium tracking-tight'

/**
 * The inspector's view, for the whole country at /app or one district at
 * /app/districts/:code. Every panel polls on its own; the district in view is
 * the address, so it survives a reload and the back button works.
 */
export function DashboardPage() {
  const { code } = useParams()
  const selected = code ?? null

  const districts = useDistricts()
  const alerts = useAlerts(selected)
  const reports = useLocatedReports(selected)
  const weekly = useWeeklyCounts(selected)
  const facilities = useFacilities(selected)

  const queryClient = useQueryClient()
  const refreshing = useIsFetching() > 0
  const [hidden, setHidden] = useState<ReadonlySet<SymptomGroup>>(new Set())

  const district = selected === null ? null : districts.data?.find((d) => d.code === selected)
  const areaName = selected === null ? 'All of Sri Lanka' : (district?.name ?? selected)

  useEffect(() => {
    document.title = `${areaName} · Internal dashboard · Sentinel`
  }, [areaName])

  const updatedAt = Math.max(
    districts.dataUpdatedAt,
    alerts.dataUpdatedAt,
    reports.dataUpdatedAt,
    weekly.dataUpdatedAt,
  )
  // "2 h ago" is measured from when the alerts were fetched, which polling
  // keeps within half a minute of now, rather than read from the clock mid-render.
  const now = alerts.dataUpdatedAt

  const reportsInArea =
    selected === null
      ? districts.data?.reduce((sum, d) => sum + d.reportsLast7Days, 0)
      : district?.reportsLast7Days
  const openAlerts =
    selected === null
      ? districts.data?.reduce((sum, d) => sum + d.openAlerts, 0)
      : district?.openAlerts

  // A district is framed on its facilities, which do not move, or on its
  // reports where no facility has a verified location.
  const located = (facilities.data ?? []).filter((f) => f.latitude !== null)
  const bounds =
    selected === null ? SRI_LANKA : boundsOf(located.length > 0 ? located : (reports.data ?? []))
  const frameKey = `${selected ?? 'LK'}:${located.length}:${reports.isSuccess ? 'r' : ''}`

  const unknownDistrict = selected !== null && districts.isSuccess && district === undefined

  function toggle(group: SymptomGroup) {
    setHidden((current) => {
      const next = new Set(current)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <DashboardHeader
        updatedAt={updatedAt > 0 ? updatedAt : null}
        refreshing={refreshing}
        onRefresh={() => void queryClient.refetchQueries({ type: 'active' })}
      />

      <div className={cx(shell, 'grid flex-1 gap-xl py-lg xl:grid-cols-[15rem_minmax(0,1fr)]')}>
        <nav aria-labelledby="districts-heading" className="hidden xl:block">
          <h2 id="districts-heading" className="sr-only">
            Districts
          </h2>
          <DistrictList query={districts} selected={selected} />
        </nav>

        <main id="main" className="grid min-w-0 content-start gap-xl">
          <div className="grid gap-sm">
            <div className="grid gap-2xs">
              <h1 className={sectionTitle}>{areaName}</h1>
              <p className={cx(labelSm, caps, 'text-ink-70')}>
                {selected === null
                  ? '25 districts'
                  : district
                    ? `${district.province} Province · ${district.code}`
                    : selected}
              </p>
            </div>
            {reportsInArea !== undefined && openAlerts !== undefined ? (
              <p className="text-small text-ink-70">
                {formatCount(reportsInArea)} reports in the last 7 days ·{' '}
                {openAlerts === 1 ? '1 open alert' : `${formatCount(openAlerts)} open alerts`}
              </p>
            ) : null}
            {districts.data ? (
              <div className="max-w-[20rem] xl:hidden">
                <DistrictPicker districts={districts.data} selected={selected} />
              </div>
            ) : null}
          </div>

          {unknownDistrict ? (
            <UnknownDistrict code={selected} />
          ) : (
            <>
              <div className="grid gap-xl lg:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
                <section aria-labelledby="alerts-heading" className="grid content-start gap-sm">
                  <h2 id="alerts-heading" className={panelTitle}>
                    Alerts
                  </h2>
                  <AlertList
                    query={alerts}
                    districtName={selected === null ? null : areaName}
                    now={now}
                  />
                </section>

                <section aria-labelledby="map-heading" className="grid content-start gap-sm">
                  <h2 id="map-heading" className={panelTitle}>
                    Reports on the map
                  </h2>
                  <div className="h-[24rem] border border-ink-14 md:h-[30rem] xl:h-[34rem]">
                    <ReportMap
                      reports={(reports.data ?? []).filter((r) => !hidden.has(r.symptomGroup))}
                      facilities={facilities.data ?? []}
                      bounds={bounds}
                      frameKey={frameKey}
                    />
                  </div>
                  <QueryView
                    query={reports}
                    what="report positions"
                    loading={<LoadingRows label="Loading report positions" rows={1} />}
                  >
                    {(data) => (
                      <MapKey
                        reports={data}
                        reportsInArea={reportsInArea ?? data.length}
                        facilities={facilities.data ?? []}
                        areaName={areaName}
                        hidden={hidden}
                        onToggle={toggle}
                      />
                    )}
                  </QueryView>
                </section>
              </div>

              <section aria-labelledby="chart-heading" className="grid gap-sm">
                <div className="grid gap-2xs">
                  <h2 id="chart-heading" className={panelTitle}>
                    Weekly reports
                  </h2>
                  <p className="max-w-measure text-small text-ink-70">
                    Each symptom group’s last 7 days against the 8 weeks before, the comparison the
                    hourly detection check makes. Weeks run back from now.
                  </p>
                </div>
                <WeeklyChart query={weekly} areaName={areaName} />
              </section>
            </>
          )}
        </main>
      </div>

      <footer className="border-t border-t-ink-14 py-md">
        <p className={cx(shell, 'text-label-sm text-ink-70')}>
          Facility registry derived from the Ministry of Health Institutions dataset published by
          Team Watchdog. Map data and tiles © OpenStreetMap contributors.
        </p>
      </footer>
    </div>
  )
}

function UnknownDistrict({ code }: { code: string }) {
  return (
    <div className="grid justify-items-start gap-sm border-t border-t-ink py-md">
      <p className="font-medium">No district has the code {code}.</p>
      <p className="text-small text-ink-70">
        District codes are three capital letters, such as KDY for Kandy. Choose a district from the
        list instead.
      </p>
      <Link to="/app" className="text-small text-ink underline">
        Back to all of Sri Lanka
      </Link>
    </div>
  )
}
