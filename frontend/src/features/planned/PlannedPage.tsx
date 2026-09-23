import { Link } from 'react-router-dom'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'
import './planned.css'

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
    <div className="planned">
      <SkipLink />

      <SiteHeader />

      <main id="main" className="planned__main">
        <div className="shell planned__inner">
          {/* The status line sits under the heading, not above it. A label
              stacked over a title is a kicker, and the heading carries its own
              weight without one. */}
          <h1 className="planned__title">{title}</h1>
          <p className="planned__phase label label--sm">Not built yet · {phase}</p>
          <div className="planned__body">{children}</div>
          <p className="planned__back">
            <Link to="/">Back to the front page</Link>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
