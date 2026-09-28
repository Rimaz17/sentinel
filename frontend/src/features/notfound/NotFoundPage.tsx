import { Link } from 'react-router-dom'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'
import { cx, monoLink, sectionTitle, shell } from '@/styles/recipes'

/** An address that matches nothing in Sentinel, with the way back to the front page. */
export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />
      <SiteHeader />
      <main id="main" className="flex flex-1 items-center py-3xl">
        <div className={shell}>
          <h1 className={cx(sectionTitle, 'max-w-[18ch]')}>That page does not exist.</h1>
          <p className="mt-md max-w-measure text-ink-70">
            The address you followed does not match anything in Sentinel. If you arrived from a link
            on this site, it is a mistake worth reporting.
          </p>
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
