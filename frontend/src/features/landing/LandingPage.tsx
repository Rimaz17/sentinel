import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SkipLink } from '@/components/layout/SkipLink'
import { Entries } from './sections/Entries'
import { Hero } from './sections/Hero'
import { Mechanism } from './sections/Mechanism'
import { Privacy } from './sections/Privacy'

/** The single public entry point. */
export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SkipLink />

      <SiteHeader />

      <main id="main" className="flex-1">
        <Hero />
        <Mechanism />
        <Privacy />
        <Entries />
      </main>

      <SiteFooter />
    </div>
  )
}
