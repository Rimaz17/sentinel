import { useQueryClient } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SentinelWordmark } from '@/components/brand/SentinelWordmark'
import { QuietButton } from '@/components/ui/QuietButton'
import { SimulatedNotice } from '@/components/ui/SimulatedNotice'
import type { Account } from '@/lib/api/session'
import { cx, labelSm, shell } from '@/styles/recipes'
import { signOut } from './session'

/** Who is signed in, and the way out. */
export function AccountMenu({ account }: { account: Account }) {
  const queryClient = useQueryClient()
  return (
    <div className="flex flex-wrap items-center gap-x-sm gap-y-3xs">
      <p className={cx(labelSm, 'text-ink-70')}>
        Signed in as <span className="text-ink">{account.displayName}</span>
      </p>
      <QuietButton onClick={() => void signOut(queryClient)}>Sign out</QuietButton>
    </div>
  )
}

/**
 * The header for staff pages other than the dashboard: the wordmark home, the
 * page's section, the account, and beneath them the simulated-data notice.
 */
export function StaffHeader({
  section,
  account,
  children,
}: {
  section: string
  account: Account
  /** Anything else the second line should say. */
  children?: ReactNode
}) {
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
        <p className="border-l border-l-ink-24 ps-md text-small text-ink-70">{section}</p>
        <div className="ms-auto">
          <AccountMenu account={account} />
        </div>
      </div>
      <div className="border-t border-t-ink-08">
        <div className={cx(shell, 'flex flex-wrap items-center gap-x-md gap-y-2xs py-xs')}>
          <SimulatedNotice />
          {children}
        </div>
      </div>
    </header>
  )
}
