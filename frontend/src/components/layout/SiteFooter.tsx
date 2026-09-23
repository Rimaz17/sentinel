import { Link } from 'react-router-dom'
import { SentinelWordmark } from '@/components/brand/SentinelWordmark'
import { cx, monoLink, shell } from '@/styles/recipes'

const LINKS = [
  { to: '/dashboard', label: 'Public dashboard' },
  { to: '/signin', label: 'Staff sign-in' },
  { to: '/register', label: 'Facility registration' },
]

/**
 * Ink, not another shade of paper. A near-white footer under a near-white page
 * reads as more page; the ink ground gives the page a definite end, and it is
 * the same colour the type has been all the way down.
 *
 * Every rule and secondary tone is re-derived from paper here: the ink-alpha
 * tokens are built for a light ground and would vanish on this one. That
 * includes the selection and the focus ring.
 */
export function SiteFooter() {
  return (
    <footer className="bg-ink pt-2xl pb-xl text-paper selection:bg-paper selection:text-ink **:focus-visible:outline-paper">
      <div
        className={cx(
          shell,
          'grid gap-xl lg:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1fr)] lg:items-start lg:gap-x-2xl',
        )}
      >
        <div>
          <SentinelWordmark size="lg" tone="paper" />
          <p className="mt-sm max-w-[34ch] text-small leading-snug text-paper-72">
            Outbreak early warning for Sri Lanka. All case data is simulated.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="grid gap-[0.55rem]">
            {LINKS.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={cx(
                    monoLink,
                    'border-b border-b-transparent pb-[0.15rem] text-paper-72 no-underline',
                    'transition-[color,border-color] duration-(--dur-fast) ease-out',
                    'hover:border-b-paper hover:text-paper focus-visible:border-b-paper focus-visible:text-paper',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-2xs lg:justify-items-end lg:text-end">
          {/* Dataset attribution, not a byline. This one is owed to the
              publisher of the facility registry. 11px body text, so it needs
              the full 4.5:1; paper at 62% over ink measures 6.4:1. */}
          <p className="max-w-[42ch] text-label-sm leading-snug text-paper-62 lg:text-end">
            Facility registry derived from the Ministry of Health Institutions dataset published by
            Team Watchdog.
          </p>
        </div>
      </div>
    </footer>
  )
}
