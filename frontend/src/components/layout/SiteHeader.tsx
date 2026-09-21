import { Link } from 'react-router-dom'
import { SentinelWordmark } from '@/components/brand/SentinelWordmark'
import './site-header.css'

/**
 * A thin ruled header. The staff route lives here, deliberately quiet: most
 * visitors are members of the public and the page's weight belongs to them.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner shell">
        <Link to="/" className="brand site-header__brand" aria-label="Sentinel — home">
          <SentinelWordmark />
        </Link>

        <nav aria-label="Staff">
          <Link to="/signin" className="site-header__staff">
            Staff sign-in
          </Link>
        </nav>
      </div>
    </header>
  )
}
