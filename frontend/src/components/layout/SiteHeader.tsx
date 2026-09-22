import { Link } from 'react-router-dom'
import { SentinelWordmark } from '@/components/brand/SentinelWordmark'
import './site-header.css'

/** In-page anchors, so the header is a way around the page and not just a sign-in. */
const SECTIONS = [
  { href: '#mechanism', label: 'How it works' },
  { href: '#privacy', label: 'Privacy' },
]

/**
 * A thin ruled header. The staff route sits apart from the section links and
 * stays quiet: most visitors are members of the public, and the page's weight
 * belongs to them.
 */
export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner shell">
        <Link to="/" className="brand site-header__brand" aria-label="Sentinel, home">
          <SentinelWordmark />
        </Link>

        <nav className="site-header__nav" aria-label="Sections">
          <ul className="site-header__links">
            {SECTIONS.map((section) => (
              <li key={section.href}>
                <a className="site-header__link" href={section.href}>
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="site-header__staff-nav" aria-label="Staff">
          <Link to="/signin" className="site-header__staff">
            Staff sign-in
          </Link>
        </nav>
      </div>
    </header>
  )
}
