import { type UseQueryResult } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { caps, cx, labelSm, sectionTitle, tnum } from '@/styles/recipes'
import type { WeeklyCounts } from './api/types'
import { totalSeries } from './chart/series'
import { Sparkline } from './chart/Sparkline'
import { formatCount } from './format'
import { LoadingRows, QueryView } from './QueryView'

type AreaSummaryProps = {
  areaName: string
  /** Under the name: the province and code, or how many districts are in view. */
  subtitle: string
  reports: number | undefined
  openAlerts: number | undefined
  weekly: UseQueryResult<WeeklyCounts> | null
  /** The district picker, for screens too narrow to carry the district list. */
  picker?: ReactNode
}

/**
 * The first panel: which area is in view, its last seven days as one large
 * figure, its open alerts in words, and its nine weeks as a line whose end
 * reads against the average of the eight before.
 */
export function AreaSummary({
  areaName,
  subtitle,
  reports,
  openAlerts,
  weekly,
  picker,
}: AreaSummaryProps) {
  return (
    <Panel as="div" className="gap-md">
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="grid gap-2xs">
          <h1 className={sectionTitle}>{areaName}</h1>
          <p className={cx(labelSm, caps, 'text-ink-70')}>{subtitle}</p>
        </div>
        {picker ? <div className="w-full max-w-[18rem] xl:hidden">{picker}</div> : null}
      </div>

      <div className="grid gap-md border-t border-t-ink-14 pt-md md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)] md:items-end">
        <div className="grid gap-xs">
          {reports === undefined ? (
            <LoadingRows label="Loading the area's figures" rows={1} />
          ) : (
            <p className="grid">
              <span className="text-[clamp(2.5rem,2rem+2vw,3.5rem)] leading-display font-medium tracking-display">
                {formatCount(reports)}
              </span>{' '}
              <span className="text-small text-ink-70">reports in the last 7 days</span>
            </p>
          )}
          {openAlerts === undefined ? null : (
            <p className="inline-flex items-center gap-[0.4rem] text-small font-medium">
              <span
                aria-hidden="true"
                className={cx(
                  'inline-block size-[0.6rem] border',
                  openAlerts > 0 ? 'border-alert bg-alert' : 'border-ink-40 bg-transparent',
                )}
              />
              {openAlerts === 1 ? '1 open alert' : `${formatCount(openAlerts)} open alerts`}
            </p>
          )}
        </div>

        {weekly ? (
          <div className="grid gap-3xs md:justify-items-end">
            <QueryView
              query={weekly}
              what="weekly totals"
              loading={<LoadingRows label="Loading weekly totals" rows={1} />}
            >
              {(data) => {
                const series = totalSeries(data)
                return (
                  <>
                    <Sparkline series={series} areaName={areaName} />
                    <p className="text-small text-ink-70 md:text-end">
                      {series.average > 0 ? (
                        <>
                          This week is{' '}
                          <span className={cx('font-mono text-ink', tnum)}>
                            {Math.round((series.current / series.average) * 100)}%
                          </span>{' '}
                          of the <span className="whitespace-nowrap">8-week average</span>
                        </>
                      ) : (
                        'No 8-week average yet'
                      )}
                    </p>
                  </>
                )
              }}
            </QueryView>
          </div>
        ) : null}
      </div>
    </Panel>
  )
}
