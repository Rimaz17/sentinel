import { type ReactNode } from 'react'
import { Email } from '@/components/ui/Email'
import { Panel } from '@/components/ui/Panel'
import { Button } from '@/components/ui/Button'
import { SimulatedNotice } from '@/components/ui/SimulatedNotice'
import { type Demo, type DemoAccount, resetTime } from './api'

/** The id of the panel's heading, which "Try a demo account" scrolls to and focuses. */
export const DEMO_ACCOUNTS_HEADING = 'demo-accounts-heading'

/**
 * What each demo account is called on the page, what it reaches, and what
 * signing in with it shows. The four descriptions are kept to about the same
 * length, so they take the same number of lines side by side.
 */
function describe(account: DemoAccount): { title: string; scope: string; what: ReactNode } {
  switch (account.role) {
    case 'ADMIN':
      return {
        title: 'Administrator',
        scope: 'Whole system',
        what: 'All of administration, with changes that break the demo off.',
      }
    case 'DATA_PROVIDER':
      return {
        title: 'Data provider',
        scope: 'One facility in Colombo',
        what: `Submits reports for ${account.facilityName ?? 'its facility'}.`,
      }
    case 'PHI':
      return account.districts.includes('*')
        ? {
            title: 'Public health inspector',
            scope: 'Every district',
            what: 'The internal dashboard, alerts and map for all 25 districts.',
          }
        : {
            title: 'Public health inspector',
            scope: 'Colombo only',
            what: (
              <>
                Once signed in, visit <span className="whitespace-nowrap">/app/districts/KDY</span>{' '}
                to see Kandy refused.
              </>
            ),
          }
  }
}

/**
 * The published demo accounts, below the sign-in form. Each one's email and
 * password are shown as text, and "Use this account" fills them into the form,
 * so a visitor still signs in through the real form rather than a shortcut
 * around it.
 *
 * Every account is a column of five rows (title, scope, description,
 * credentials, button) on one shared grid, so each row starts on the same line
 * across the columns and the spacing between them is the same in every column.
 * Four columns wait for 88rem, the first width at which the longest demo email
 * fits on one line in its column; below it two columns, then one.
 */
export function DemoAccountsPanel({
  demo,
  onUse,
}: {
  demo: Demo
  onUse: (account: DemoAccount, title: string) => void
}) {
  return (
    <Panel labelledBy={DEMO_ACCOUNTS_HEADING} className="gap-md md:p-lg">
      <div className="flex flex-wrap items-start justify-between gap-x-lg gap-y-sm">
        <div className="grid gap-2xs">
          <h2
            id={DEMO_ACCOUNTS_HEADING}
            tabIndex={-1}
            className="scroll-mt-[5.5rem] text-section leading-snug font-medium tracking-tight"
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
      <ul className="grid gap-x-lg gap-y-lg border-t border-t-ink pt-md md:grid-cols-2 min-[88rem]:grid-cols-4">
        {demo.accounts.map((account) => {
          const { title, scope, what } = describe(account)
          const label = `${title} · ${scope}`
          return (
            <li
              key={account.email}
              className="row-span-5 grid grid-rows-subgrid gap-y-xs border-t border-t-ink-14 pt-lg first:border-t-0 first:pt-0 md:border-t-0 md:pt-0"
            >
              <h3 className="text-body font-medium">{title}</h3>
              <p className="w-fit self-start rounded-full bg-ink-08 px-xs py-[0.15rem] text-label font-medium text-ink-85">
                {scope}
              </p>
              <p className="text-small text-ink-70">{what}</p>
              <dl className="grid content-start gap-xs rounded-control border border-ink-08 bg-paper-raised px-xs py-xs">
                <div className="grid gap-[0.125rem]">
                  <dt className="text-label text-ink-70">Email</dt>
                  <dd className="text-small font-medium break-words">
                    <Email address={account.email} />
                  </dd>
                </div>
                <div className="grid gap-[0.125rem]">
                  <dt className="text-label text-ink-70">Password</dt>
                  <dd className="text-small font-medium break-all">{demo.password}</dd>
                </div>
              </dl>
              <div>
                <Button onClick={() => onUse(account, label)}>
                  Use this account<span className="sr-only">: {label}</span>
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
