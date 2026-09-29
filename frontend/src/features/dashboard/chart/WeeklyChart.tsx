import { type UseQueryResult } from '@tanstack/react-query'
import { useId } from 'react'
import { caps, cx, labelSm, tnum } from '@/styles/recipes'
import { SYMPTOM_GROUPS, type SymptomGroup, type WeeklyCounts } from '../api/types'
import { formatCount, formatDay, formatDecimal } from '../format'
import { LoadingRows, QueryView } from '../QueryView'
import { SYMPTOM_GROUP_STYLES } from '../symptomGroups'
import { scaleMax, type Series, seriesFor } from './series'

type WeeklyChartProps = {
  query: UseQueryResult<WeeklyCounts>
  areaName: string
  /** Public wording for a failed load; see QueryView. */
  errorWords?: string
  /** Set across a full-width panel: the four groups in one row from 68rem. */
  wide?: boolean
}

/**
 * The per-area chart: one small panel per symptom group, nine weeks each. The
 * last seven days are drawn solid against the eight weeks before them, with a
 * dashed line at those weeks' average: the comparison a detection check makes.
 * Every panel is named, so no group is identified by its colour alone, and the
 * same numbers are available as a table.
 */
export function WeeklyChart({ query, areaName, errorWords, wide = false }: WeeklyChartProps) {
  return (
    <QueryView
      query={query}
      what="weekly counts"
      {...(errorWords ? { errorWords } : {})}
      loading={<LoadingRows label="Loading weekly counts" rows={2} />}
    >
      {(weekly) => (
        <div className="grid gap-md">
          <p className={cx(labelSm, 'flex flex-wrap items-center gap-x-md gap-y-3xs text-ink-70')}>
            <span className="inline-flex items-center gap-[0.4rem]">
              <span aria-hidden="true" className="inline-block h-[0.6rem] w-[0.45rem] bg-ink" />
              Last 7 days
            </span>
            <span className="inline-flex items-center gap-[0.4rem]">
              <span aria-hidden="true" className="inline-block h-[0.6rem] w-[0.45rem] bg-ink-24" />
              The 8 weeks before
            </span>
            <span className="inline-flex items-center gap-[0.4rem]">
              <span
                aria-hidden="true"
                className="inline-block w-[0.9rem] border-t border-dashed border-t-ink"
              />
              Their average
            </span>
          </p>

          <ul className={cx('grid gap-x-lg gap-y-md md:grid-cols-2', wide && 'xl:grid-cols-4')}>
            {SYMPTOM_GROUPS.map((group) => (
              <li key={group}>
                <GroupPanel group={group} weekly={weekly} areaName={areaName} />
              </li>
            ))}
          </ul>

          <details className="border-t border-t-ink-14 pt-xs">
            <summary
              className={cx(labelSm, caps, 'cursor-pointer py-2xs text-ink-70 hover:text-ink')}
            >
              The numbers as a table
            </summary>
            <WeeklyTable weekly={weekly} areaName={areaName} />
          </details>
        </div>
      )}
    </QueryView>
  )
}

/*
 * Drawn at close to its rendered size in a two-column layout, so the bars stay
 * near 24px wide and the label near 11px rather than scaling up with the column.
 */
const WIDTH = 320
const HEIGHT = 84
const SLOT = WIDTH / 9
const BAR = Math.min(24, SLOT - 2)

function GroupPanel({
  group,
  weekly,
  areaName,
}: {
  group: SymptomGroup
  weekly: WeeklyCounts
  areaName: string
}) {
  const style = SYMPTOM_GROUP_STYLES[group]
  const series = seriesFor(weekly, group)
  const top = scaleMax(series)
  const y = (count: number) => HEIGHT - (count / top) * HEIGHT
  const averageY = y(series.average)
  const nameId = useId()

  return (
    <figure aria-labelledby={nameId} className="grid gap-2xs">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-sm">
        <span id={nameId} className="inline-flex items-center gap-[0.4rem] text-small font-medium">
          <span aria-hidden="true" className={cx('inline-block size-[0.6rem]', style.swatch)} />
          {style.label}
        </span>
        <span className={cx(labelSm, 'text-ink-70')}>
          <span className="text-ink">{formatCount(series.current)}</span> in the last 7 days ·
          average {formatDecimal(series.average)}
        </span>
      </figcaption>

      <svg
        viewBox={`0 -16 ${WIDTH} ${HEIGHT + 17}`}
        role="img"
        aria-label={chartLabel(style.label, areaName, series)}
        className="h-auto w-full overflow-visible"
      >
        {series.counts.map((count, index) => {
          const isCurrent = index === series.counts.length - 1
          const x = index * SLOT + (SLOT - BAR) / 2
          const week = weekly.weeks[index]
          return (
            <g key={index}>
              <path
                d={barPath(x, y(count), BAR, HEIGHT - y(count))}
                fill={style.hue}
                fillOpacity={isCurrent ? 1 : 0.32}
              >
                {week ? (
                  <title>
                    {isCurrent
                      ? `Last 7 days: ${count}`
                      : `${formatDay(week.start)} to ${formatDay(week.end)}: ${count}`}
                  </title>
                ) : null}
              </path>
              {isCurrent ? (
                <text
                  x={x + BAR / 2}
                  y={y(count) - 4}
                  textAnchor="middle"
                  // A paper halo, so the dashed average never runs through the figure.
                  stroke="var(--color-paper)"
                  strokeWidth={3}
                  paintOrder="stroke"
                  className="fill-ink font-mono text-[11px] font-medium"
                >
                  {count}
                </text>
              ) : null}
            </g>
          )
        })}
        <line
          x1={0}
          x2={WIDTH}
          y1={averageY}
          y2={averageY}
          className="stroke-ink"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <line x1={0} x2={WIDTH} y1={HEIGHT} y2={HEIGHT} className="stroke-ink-24" strokeWidth={1} />
      </svg>

      <p className={cx(labelSm, 'flex justify-between text-ink-70')} aria-hidden="true">
        <span>{weekly.weeks[0] ? formatDay(weekly.weeks[0].start) : ''}</span>
        <span>Now</span>
      </p>
    </figure>
  )
}

/** A bar grown from the baseline, with a 4px rounded top and a square foot. */
function barPath(x: number, y: number, width: number, height: number): string {
  if (height <= 0) return ''
  const r = Math.min(4, width / 2, height)
  return [
    `M${x},${y + height}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + width - r}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `V${y + height}`,
    'Z',
  ].join(' ')
}

function chartLabel(group: string, areaName: string, series: Series): string {
  return `${group} reports per week, ${areaName}: ${series.current} in the last 7 days, against an average of ${formatDecimal(series.average)} over the 8 weeks before.`
}

function WeeklyTable({ weekly, areaName }: { weekly: WeeklyCounts; areaName: string }) {
  const lastIndex = weekly.weeks.length - 1
  return (
    <div className="mt-xs overflow-x-auto">
      <table className={cx('w-full border-collapse text-small', tnum)}>
        <caption className="sr-only">Reports per week by symptom group, {areaName}</caption>
        <thead>
          <tr className="border-b border-b-ink">
            <th scope="col" className="py-2xs pe-sm text-start font-medium">
              Week
            </th>
            {SYMPTOM_GROUPS.map((group) => (
              <th key={group} scope="col" className="py-2xs ps-sm text-end font-medium">
                {SYMPTOM_GROUP_STYLES[group].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weekly.weeks.map((week, index) => (
            <tr key={week.start} className="border-b border-b-ink-14">
              <th scope="row" className="py-2xs pe-sm text-start font-regular whitespace-nowrap">
                {index === lastIndex
                  ? 'Last 7 days'
                  : `${formatDay(week.start)} to ${formatDay(week.end)}`}
              </th>
              {SYMPTOM_GROUPS.map((group) => (
                <td key={group} className="py-2xs ps-sm text-end font-mono text-label">
                  {week.counts[group]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
