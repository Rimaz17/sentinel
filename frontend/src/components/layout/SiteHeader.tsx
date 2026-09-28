import { Link } from 'react-router-dom'
import { SentinelWordmark } from '@/components/brand/SentinelWordmark'
import { cx, monoLink, shell } from '@/styles/recipes'

/**
 * The front page's sections, so the header is a way around the page and not
 * just a sign-in. They name the front page, so the same header works on every
 * page that carries it: on the front page they scroll, elsewhere they lead back.
 */
const SECTIONS = [
  { href: '/#mechanism', label: 'How it works' },
  { href: '/#privacy', label: 'Privacy' },
]

/**
 * A thin ruled header. The staff route sits apart from the section links and
 * stays quiet: most visitors are members of the public, and the page's weight
 * belongs to them.
 *
 * The blur is an effect, not decoration: it exists so the ridges can pass under
 * the header without the wordmark losing contrast. Where it is unsupported, the
 * ground goes solid instead of going translucent.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-b-ink-08 bg-paper-86 backdrop-blur-[10px] not-supports-[backdrop-filter:blur(10px)]:bg-paper">
      <div className={cx(shell, 'flex min-h-header items-center gap-md')}>
        <Link
          to="/"
          className="group/brand inline-flex items-center gap-[0.6rem] text-ink no-underline"
          aria-label="Sentinel, home"
        >
          <SentinelWordmark />
        </Link>

        {/* The section links sit to the right, beside the staff route, so the
            whole navigation reads as one group opposite the wordmark. */}
        <nav className="ms-auto hidden md:block" aria-label="Sections">
          <ul className="flex items-center gap-lg">
            {SECTIONS.map((section) => (
              <li key={section.href}>
                <a
                  className={cx(
                    monoLink,
                    'border-b border-b-transparent py-[0.35rem] font-medium text-ink-70 no-underline',
                    'transition-[color,border-color] duration-(--dur-fast) ease-out',
                    'hover:border-b-ink-40 hover:text-ink focus-visible:border-b-ink-40 focus-visible:text-ink',
                  )}
                  href={section.href}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Pushed right on its own below md, where the section links hide; from
            md the links group is already pushed right, so this only holds the
            staff route a little apart from them. */}
        <nav className="ms-auto md:ms-sm" aria-label="Staff">
          <Link
            to="/signin"
            className={cx(
              monoLink,
              'border-b border-b-ink-24 py-[0.35rem] font-medium text-ink-70 no-underline',
              'transition-[color,border-color] duration-(--dur-fast) ease-out',
              'hover:border-b-ink hover:text-ink focus-visible:border-b-ink focus-visible:text-ink',
            )}
          >
            Staff sign-in
          </Link>
        </nav>
      </div>
    </header>
  )
}
