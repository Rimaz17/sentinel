import { Link } from 'react-router-dom'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'
import { caps, cx, labelSm, monoLink, sectionTitle, shell } from '@/styles/recipes'

type PlannedPageProps = {
  title: string
  /** Build phase from the project plan, e.g. "Phase 4, Accounts and roles". */
  phase: string
  /** What will actually live at this route. Written plainly, not as a promise. */
  children: React.ReactNode
}

/**
 * A route that exists but is not built yet.
 *
 * The landing page links here rather than to nothing, and this page says
 * plainly what is planned and which build phase it belongs to. It does not
 * pretend to be a product surface, and it does not show a fake dashboard.
 */
export function PlannedPage({ title, phase, children }: PlannedPageProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />

      <SiteHeader />

      <main id="main" className="flex flex-1 items-center py-3xl">
        <div className={shell}>
          {/* The status line sits under the heading, not above it. A label
              stacked over a title is a kicker, and the heading carries its own
              weight without one. */}
          <h1 className={cx(sectionTitle, 'max-w-[18ch]')}>{title}</h1>
          <p
            className={cx(labelSm, caps, 'mt-sm w-fit border-t border-t-ink-24 pt-2xs text-ink-70')}
          >
            Not built yet · {phase}
          </p>
          <div className="mt-md grid max-w-measure gap-sm text-ink-70">{children}</div>
          <p className={cx(monoLink, 'mt-xl')}>
            <Link
              to="/"
              className="border-b border-b-ink-24 pb-[0.2rem] text-ink no-underline hover:border-b-ink"
            >
              Back to the front page
            </Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
