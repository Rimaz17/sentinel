import { Link } from 'react-router-dom'
import { SentinelWordmark } from '@/components/brand/SentinelWordmark'
import { QuietButton } from '@/components/ui/QuietButton'
import { SimulatedNotice } from '@/components/ui/SimulatedNotice'
import { cx, labelSm, shell } from '@/styles/recipes'
import { POLL_INTERVAL_MS } from './api/queries'
import { formatClock } from './format'

type DashboardHeaderProps = {
  /** When the newest figures on screen arrived, or null before any have. */
  updatedAt: number | null
  refreshing: boolean
  onRefresh: () => void
}

/**
 * A thin ruled bar: the wordmark home, what this view is, and how fresh its
 * figures are. Beneath it, the simulated-data notice, and a plain statement
 * that this internal view has no sign-in yet.
 */
export function DashboardHeader({ updatedAt, refreshing, onRefresh }: DashboardHeaderProps) {
  return (
    <header className="border-b border-b-ink-14">
      <div className={cx(shell, 'flex min-h-header flex-wrap items-center gap-x-md gap-y-2xs')}>
        <Link
          to="/"
          className="group/brand inline-flex items-center text-ink no-underline"
          aria-label="Sentinel, home"
        >
          <SentinelWordmark />
        </Link>
        <p className="border-l border-l-ink-24 ps-md text-small text-ink-70">Internal dashboard</p>

        <div className="ms-auto flex flex-wrap items-center gap-x-md gap-y-3xs">
          <RefreshStatus updatedAt={updatedAt} />
          <QuietButton onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing' : 'Refresh now'}
          </QuietButton>
        </div>
      </div>

      <div
        className={cx(
          shell,
          'flex flex-wrap items-center gap-x-md gap-y-2xs border-t border-t-ink-08 py-xs',
        )}
      >
        <SimulatedNotice />
        <p className="text-small text-ink-70">
          Inspector view with no sign-in until Phase 4. Keep the API on your own machine.
        </p>
      </div>
    </header>
  )
}

export function RefreshStatus({ updatedAt }: { updatedAt: number | null }) {
  const every = `every ${POLL_INTERVAL_MS / 1000} s`
  return (
    <p className={cx(labelSm, 'text-ink-70')}>
      {updatedAt === null ? (
        `Loading · refreshes ${every}`
      ) : (
        <>
          Updated <time dateTime={new Date(updatedAt).toISOString()}>{formatClock(updatedAt)}</time>{' '}
          Sri Lanka time · refreshes {every}
        </>
      )}
    </p>
  )
}
