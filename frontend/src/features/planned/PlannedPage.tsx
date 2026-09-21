import { Link } from 'react-router-dom'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import './planned.css'

type PlannedPageProps = {
  title: string
  /** Build phase from the project plan, e.g. "Phase 4 — Accounts and roles". */
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
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteHeader />

      <main id="main" className="planned__main">
        <div className="shell planned__inner">
          <p className="planned__phase label label--sm">Not built yet · {phase}</p>
          <h1 className="planned__title">{title}</h1>
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
