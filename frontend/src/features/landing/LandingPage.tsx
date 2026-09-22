import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { Entries } from './sections/Entries'
import { Hero } from './sections/Hero'
import { Mechanism } from './sections/Mechanism'
import { Privacy } from './sections/Privacy'
import './landing.css'

/** The single public entry point. */
export function LandingPage() {
  return (
    <div className="landing">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteHeader />

      <main id="main" className="landing__main">
        <Hero />
        <Mechanism />
        <Privacy />
        <Entries />
      </main>

      <SiteFooter />
    </div>
  )
}
