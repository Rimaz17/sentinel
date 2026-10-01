import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { SkipLink } from '@/components/layout/SkipLink'
import { useAccount } from '@/features/auth/session'
import { Panel, PanelHeading } from '@/components/ui/Panel'
import { cx, shell } from '@/styles/recipes'
import {
  useAlerts,
  useDistricts,
  useFacilities,
  useLocatedReports,
  useWeeklyCounts,
} from './api/queries'
import type { SymptomGroup } from './api/types'
import { AlertList } from './AlertList'
import { AreaSummary } from './AreaSummary'
import { WeeklyChart } from './chart/WeeklyChart'
import { DashboardHeader } from './DashboardHeader'
import { useAlertStream } from './live/useAlertStream'
import { ALL_OF_SRI_LANKA, DistrictList, DistrictPicker } from './DistrictList'
import { boundsOf, SRI_LANKA } from './map/geometry'
import { MapKey } from './map/MapKey'
import { ReportMap } from './map/ReportMap'
import { districtPath } from './paths'
import { LoadingRows, QueryView } from './QueryView'

/**
 * The inspector's view, for the whole country at /app or one district at
 * /app/districts/:code. Alerts are pushed over the alert socket, and polled
 * only while it is not open; every other panel polls on its own. The district
 * in view is the address, so it survives a reload and the back button works.
 */
export function DashboardPage() {
  const account = useAccount()
  const national = account.districts.includes('*')
  const onlyDistrict = !national && account.districts.length === 1 ? account.districts[0] : null
  const { code } = useParams()
  // District codes are capitals (KDY), but an address typed as /app/districts/kdy
  // means the same district: it is read as KDY and the address corrected to match.
  const selected = code === undefined ? null : code.toUpperCase()
  const navigate = useNavigate()
  useEffect(() => {
    if (code !== undefined && code !== code.toUpperCase()) {
      void navigate(districtPath(code.toUpperCase()), { replace: true })
    }
  }, [code, navigate])

  // A district outside the inspector's scope is refused by the API; the page says so itself
  // rather than asking for data it cannot have.
  const outOfScope = selected !== null && !national && !account.districts.includes(selected)
  const inView = outOfScope ? null : selected

  const live = useAlertStream()
  const districts = useDistricts()
  const alerts = useAlerts(inView, live.status === 'live')
  const reports = useLocatedReports(inView)
  const weekly = useWeeklyCounts(inView)
  const facilities = useFacilities(inView)

  const queryClient = useQueryClient()
  const refreshing = useIsFetching() > 0
  const [hidden, setHidden] = useState<ReadonlySet<SymptomGroup>>(new Set())

  const district = selected === null ? null : districts.data?.find((d) => d.code === selected)
  const allLabel = national ? ALL_OF_SRI_LANKA : 'Your districts'
  const backLabel = national ? 'Back to all of Sri Lanka' : 'Back to your districts'
  const areaName = selected === null ? allLabel : (district?.name ?? selected)

  useEffect(() => {
    document.title = `${areaName} · Internal dashboard · Sentinel`
  }, [areaName])

  const updatedAt = Math.max(
    districts.dataUpdatedAt,
    alerts.dataUpdatedAt,
    reports.dataUpdatedAt,
    weekly.dataUpdatedAt,
  )
  // "2 h ago" is measured from the newest fetch rather than read from the clock
  // mid-render. Pushed alerts are fetched only when they change, but the
  // district list polls, which keeps this within half a minute of now.
  const now = Math.max(alerts.dataUpdatedAt, districts.dataUpdatedAt)

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

  const unknownDistrict =
    selected !== null && !outOfScope && districts.isSuccess && district === undefined

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

  // An inspector who covers one district has no wider view to show.
  if (selected === null && onlyDistrict) {
    return <Navigate to={districtPath(onlyDistrict)} replace />
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      {/* Always present, so a screen reader hears each new alert as it is raised. */}
      <p role="status" className="sr-only">
        {live.announcement}
      </p>
      <DashboardHeader
        account={account}
        updatedAt={updatedAt > 0 ? updatedAt : null}
        live={live.status}
        refreshing={refreshing}
        onRefresh={() => void queryClient.refetchQueries({ type: 'active' })}
      />

      <main
        id="main"
        className={cx(
          shell,
          'grid flex-1 content-start gap-md py-md xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start',
        )}
      >
        <div className="grid min-w-0 content-start gap-md">
          <AreaSummary
            areaName={areaName}
            subtitle={
              selected === null
                ? national
                  ? '25 districts'
                  : `${account.districts.length} districts`
                : district
                  ? `${district.province} Province · ${district.code}`
                  : selected
            }
            reports={reportsInArea}
            openAlerts={openAlerts}
            weekly={outOfScope || unknownDistrict ? null : weekly}
            picker={
              districts.data ? (
                <DistrictPicker
                  districts={districts.data}
                  selected={selected}
                  allLabel={allLabel}
                />
              ) : null
            }
          />

          {outOfScope ? (
            <OutOfScope code={selected} back={backLabel} />
          ) : unknownDistrict ? (
            <UnknownDistrict code={selected} back={backLabel} />
          ) : (
            <>
              <Panel labelledBy="alerts-heading">
                <PanelHeading id="alerts-heading">Alerts</PanelHeading>
                <AlertList
                  query={alerts}
                  districtName={selected === null ? null : areaName}
                  now={now}
                />
              </Panel>

              <Panel labelledBy="chart-heading" className="gap-md">
                <PanelHeading
                  id="chart-heading"
                  description="Each symptom group’s last 7 days against the 8 weeks before, the comparison the hourly detection check makes. Weeks run back from now."
                >
                  Weekly reports
                </PanelHeading>
                <WeeklyChart query={weekly} areaName={areaName} />
              </Panel>
            </>
          )}
        </div>

        <div className="grid min-w-0 content-start gap-md">
          <Panel as="nav" labelledBy="districts-heading" className="hidden xl:grid">
            <PanelHeading id="districts-heading">Districts</PanelHeading>
            <DistrictList
              query={districts}
              selected={selected}
              allLabel={allLabel}
              showTotal={onlyDistrict === null}
            />
          </Panel>

          {outOfScope || unknownDistrict ? null : (
            <Panel labelledBy="map-heading">
              <PanelHeading id="map-heading">Reports on the map</PanelHeading>
              <div className="h-[22rem] overflow-hidden rounded-control border border-ink-14 md:h-[28rem] xl:h-[32rem]">
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
            </Panel>
          )}
        </div>
      </main>

      <footer className="border-t border-t-ink-14 py-md">
        <p className={cx(shell, 'text-label-sm text-ink-70')}>
          Facility registry derived from the Ministry of Health Institutions dataset published by
          Team Watchdog. Map data and tiles © OpenStreetMap contributors.
        </p>
      </footer>
    </div>
  )
}

/** A district the inspector's account does not cover. Nothing about it is shown or fetched. */
function OutOfScope({ code, back }: { code: string; back: string }) {
  return (
    <Panel as="div" className="justify-items-start">
      <p className="font-medium">Your account does not cover {code}.</p>
      <p className="text-small text-ink-70">
        Inspectors see the districts an administrator assigned to them. To work on another district,
        ask an administrator to add it to your account.
      </p>
      <Link to="/app" className="text-small text-ink underline">
        {back}
      </Link>
    </Panel>
  )
}

function UnknownDistrict({ code, back }: { code: string; back: string }) {
  return (
    <Panel as="div" className="justify-items-start">
      <p className="font-medium">No district has the code {code}.</p>
      <p className="text-small text-ink-70">
        District codes are three capital letters, such as KDY for Kandy. Choose a district from the
        list instead.
      </p>
      <Link to="/app" className="text-small text-ink underline">
        {back}
      </Link>
    </Panel>
  )
}
