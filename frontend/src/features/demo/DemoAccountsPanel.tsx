import { type ReactNode } from 'react'
import { Panel } from '@/components/ui/Panel'
import { QuietButton } from '@/components/ui/QuietButton'
import { SimulatedNotice } from '@/components/ui/SimulatedNotice'
import { caps, cx, labelSm } from '@/styles/recipes'
import { type Demo, type DemoAccount, resetTime } from './api'

/** What each demo account is called on the page, and what signing in with it shows. */
function describe(account: DemoAccount): { title: string; what: ReactNode } {
  switch (account.role) {
    case 'ADMIN':
      return {
        title: 'Administrator',
        what: 'Every page of administration. A few changes that would spoil the demo for the next visitor are switched off.',
      }
    case 'DATA_PROVIDER':
      return {
        title: 'Data provider · one facility',
        what: `Submits reports for ${account.facilityName ?? 'its facility'}, in Colombo.`,
      }
    case 'PHI':
      return account.districts.includes('*')
        ? {
            title: 'Public health inspector · every district',
            what: 'The internal dashboard across all 25 districts: alerts, the report map and the weekly chart.',
          }
        : {
            title: 'Public health inspector · Colombo',
            what: (
              <>
                Covers Colombo only. Once signed in, go to{' '}
                <span className="font-mono">/app/districts/KDY</span> to see Kandy refused.
              </>
            ),
          }
  }
}

/** An email address that wraps, when it must, before its @ rather than mid-word. */
function Email({ address }: { address: string }) {
  const at = address.indexOf('@')
  return at < 0 ? (
    address
  ) : (
    <>
      {address.slice(0, at)}
      <wbr />
      {address.slice(at)}
    </>
  )
}

/**
 * The published demo accounts, below the sign-in form. Each one's email and
 * password are shown as text, and "Use this account" fills them into the form,
 * so a visitor still signs in through the real form rather than a shortcut
 * around it.
 */
export function DemoAccountsPanel({
  demo,
  onUse,
}: {
  demo: Demo
  onUse: (account: DemoAccount, title: string) => void
}) {
  return (
    <Panel labelledBy="demo-accounts-heading" className="gap-md md:p-lg">
      <div className="flex flex-wrap items-start justify-between gap-x-lg gap-y-sm">
        <div className="grid gap-2xs">
          <h2
            id="demo-accounts-heading"
            className="text-section leading-snug font-medium tracking-tight"
          >
            Demo accounts
          </h2>
          <p className="max-w-measure text-small text-ink-70">
            Sentinel is a demonstration, so you can sign in as any of its staff. Choose an account
            to fill in the form, then sign in. Everything visitors change is put back every night at{' '}
            {resetTime(demo)} Sri Lanka time.
          </p>
        </div>
        <SimulatedNotice />
      </div>
      <ul className="grid gap-x-lg gap-y-md border-t border-t-ink pt-md md:grid-cols-2 xl:grid-cols-4">
        {demo.accounts.map((account) => {
          const { title, what } = describe(account)
          return (
            <li
              key={account.email}
              className="grid grid-rows-[auto_1fr_auto_auto] gap-xs border-t border-t-ink-14 pt-md first:border-t-0 first:pt-0 md:border-t-0 md:pt-0"
            >
              <h3 className="text-body font-medium">{title}</h3>
              <p className="text-small text-ink-70">{what}</p>
              <dl className="grid gap-2xs">
                <div className="grid gap-3xs">
                  <dt className={cx(labelSm, caps, 'text-ink-70')}>Email address</dt>
                  <dd className="font-mono text-small">
                    <Email address={account.email} />
                  </dd>
                </div>
                <div className="grid gap-3xs">
                  <dt className={cx(labelSm, caps, 'text-ink-70')}>Password</dt>
                  <dd className="font-mono text-small break-all">{demo.password}</dd>
                </div>
              </dl>
              <div>
                <QuietButton onClick={() => onUse(account, title)}>
                  Use this account<span className="sr-only">: {title}</span>
                </QuietButton>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
