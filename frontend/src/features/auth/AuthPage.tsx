import { type ReactNode } from 'react'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'
import { Panel } from '@/components/ui/Panel'
import { cx, sectionTitle, shell, SPLIT_COLUMNS } from '@/styles/recipes'

type AuthPageProps = {
  title: string
  /** One or two sentences under the title: who this page is for. */
  intro: ReactNode
  /** Where the visitor is: a StepRail or a RouteList. */
  rail?: ReactNode
  /** The form, or whatever stands in for it while a link is checked. */
  children: ReactNode
  /** Below the rail: routes for people this page is not for. */
  aside?: ReactNode
}

/**
 * The frame for signing in, registering and activating, on the landing page's
 * shared two-column grid. Each half is a sheet panel, as on the dashboards and
 * report submission: the title, the rail and the notes on the left, the form on
 * the right. From 68rem the two sheets stand side by side, their tops and feet
 * level; below that the form's sheet follows the other.
 */
export function AuthPage({ title, intro, rail, children, aside }: AuthPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <SiteHeader />
      <main id="main" className="flex-1 py-lg">
        <div className={cx(shell, 'grid gap-md xl:gap-lg', SPLIT_COLUMNS)}>
          <Panel as="div" className="gap-lg md:p-lg">
            <div className="grid gap-sm">
              <h1 className={sectionTitle}>{title}</h1>
              <div className="max-w-measure-narrow text-body text-ink-70">{intro}</div>
            </div>
            {rail}
            {aside ? (
              <div className="grid max-w-measure-narrow gap-xs text-small text-ink-70">{aside}</div>
            ) : null}
          </Panel>
          <Panel as="div" className="gap-md md:p-lg">
            {children}
          </Panel>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

/** Shown while the session is being recovered from the refresh cookie. */
export function CheckingSession() {
  return (
    <p role="status" className="p-gutter text-small text-ink-70">
      Checking your session
    </p>
  )
}
