import { type ReactNode } from 'react'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'
import { cx, sectionTitle, shell } from '@/styles/recipes'

type AuthPageProps = {
  title: string
  /** One or two sentences under the title: who this page is for. */
  intro: ReactNode
  children: ReactNode
  /** Set apart under a rule, below the form: routes for people this page is not for. */
  aside?: ReactNode
}

/**
 * The frame for signing in, registering and activating: the site's own header
 * and footer around a single narrow column, so a form reads as part of the same
 * sheet as the landing page rather than as a separate application.
 */
export function AuthPage({ title, intro, children, aside }: AuthPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <SiteHeader />
      <main id="main" className="flex-1 py-2xl">
        <div className={cx(shell, 'grid max-w-[34rem] gap-lg')}>
          <div className="grid gap-sm">
            <h1 className={sectionTitle}>{title}</h1>
            <div className="max-w-measure-narrow text-body text-ink-70">{intro}</div>
          </div>
          {children}
          {aside ? (
            <div className="grid gap-xs border-t border-t-ink-14 pt-md text-small text-ink-70">
              {aside}
            </div>
          ) : null}
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
