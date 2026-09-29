import { type ReactNode } from 'react'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'
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
 * shared two-column grid. From 68rem the title, the rail and the notes sit in
 * the left column and the form in the right, starting level with the title;
 * below that they stack in reading order: title, rail, form, notes.
 */
export function AuthPage({ title, intro, rail, children, aside }: AuthPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <SiteHeader />
      <main id="main" className="flex-1 py-2xl">
        <div
          className={cx(
            shell,
            'grid gap-lg xl:grid-rows-[auto_auto_1fr] xl:gap-x-2xl xl:gap-y-lg',
            SPLIT_COLUMNS,
          )}
        >
          <div className="grid content-start gap-sm xl:col-start-1 xl:row-start-1">
            <h1 className={sectionTitle}>{title}</h1>
            <div className="max-w-measure-narrow text-body text-ink-70">{intro}</div>
          </div>
          {rail ? <div className="xl:col-start-1 xl:row-start-2">{rail}</div> : null}
          <div className="grid content-start gap-md border-t border-t-ink pt-md xl:col-start-2 xl:row-span-3 xl:row-start-1">
            {children}
          </div>
          {aside ? (
            <div className="grid max-w-measure-narrow content-start gap-xs border-t border-t-ink-14 pt-md text-small text-ink-70 xl:col-start-1 xl:row-start-3 xl:border-t-0 xl:pt-0">
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
