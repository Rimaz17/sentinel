import { Link } from 'react-router-dom'
import { SentinelWordmark } from '@/components/brand/SentinelWordmark'
import { QuietButton } from '@/components/ui/QuietButton'
import { AccountMenu } from '@/features/auth/AccountBar'
import type { Account } from '@/lib/api/session'
import { SimulatedNotice } from '@/components/ui/SimulatedNotice'
import { cx, labelSm, shell } from '@/styles/recipes'
import { POLL_INTERVAL_MS } from './api/queries'
import { formatClock } from './format'
import type { LiveStatus } from './live/useAlertStream'

type DashboardHeaderProps = {
  /** The inspector signed in. */
  account: Account
  /** When the newest figures on screen arrived, or null before any have. */
  updatedAt: number | null
  /** Whether alerts are arriving by push. */
  live: LiveStatus
  refreshing: boolean
  onRefresh: () => void
}

/**
 * A thin ruled bar: the wordmark home, what this view is, and how fresh its
 * figures are. Beneath it, the simulated-data notice, and who is signed in.
 */
export function DashboardHeader({
  account,
  updatedAt,
  live,
  refreshing,
  onRefresh,
}: DashboardHeaderProps) {
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
          <RefreshStatus updatedAt={updatedAt} live={live} />
          <QuietButton onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing' : 'Refresh now'}
          </QuietButton>
        </div>
      </div>

      <div className="border-t border-t-ink-08">
        <div className={cx(shell, 'flex flex-wrap items-center gap-x-md gap-y-2xs py-xs')}>
          <SimulatedNotice />
          <div className="ms-auto">
            <AccountMenu account={account} />
          </div>
        </div>
      </div>
    </header>
  )
}

/** How alerts reach the page, said in words so no state rests on a colour. */
const LIVE_WORDS: Record<LiveStatus, string> = {
  connecting: 'connecting for live alerts',
  live: 'alerts arrive live',
  reconnecting: 'live alerts reconnecting',
}

export function RefreshStatus({ updatedAt, live }: { updatedAt: number | null; live: LiveStatus }) {
  const every = `every ${POLL_INTERVAL_MS / 1000} s`
  return (
    <p className={cx(labelSm, 'text-ink-70')}>
      {updatedAt === null ? (
        `Loading · refreshes ${every} · ${LIVE_WORDS[live]}`
      ) : (
        <>
          Updated <time dateTime={new Date(updatedAt).toISOString()}>{formatClock(updatedAt)}</time>{' '}
          Sri Lanka time · refreshes {every} · {LIVE_WORDS[live]}
        </>
      )}
    </p>
  )
}
