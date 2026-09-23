import { Link } from 'react-router-dom'
import { SentinelWordmark } from '@/components/brand/SentinelWordmark'
import './site-footer.css'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell site-footer__inner">
        <div className="site-footer__brand">
          <SentinelWordmark size="lg" tone="paper" />
          <p className="site-footer__line">
            Outbreak early warning for Sri Lanka. All case data is simulated.
          </p>
        </div>

        <nav className="site-footer__nav" aria-label="Footer">
          <ul className="site-footer__links">
            <li>
              <Link to="/dashboard">Public dashboard</Link>
            </li>
            <li>
              <Link to="/signin">Staff sign-in</Link>
            </li>
            <li>
              <Link to="/register">Facility registration</Link>
            </li>
          </ul>
        </nav>

        <div className="site-footer__credit">
          {/* Dataset attribution, not a byline. This one is owed to the
              publisher of the facility registry. */}
          <p className="site-footer__source">
            Facility registry derived from the Ministry of Health Institutions dataset published by
            Team Watchdog.
          </p>
        </div>
      </div>
    </footer>
  )
}
