import { useState } from 'react'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { PlateFigure } from './plate/PlateFigure'
import { DEFAULT_PLATE_ID, PLATES } from './plate/plates'
import { Disclosure } from './sections/Disclosure'
import { Entries } from './sections/Entries'
import { Hero } from './sections/Hero'
import { Mechanism } from './sections/Mechanism'
import { Privacy } from './sections/Privacy'
import './landing.css'

/**
 * The single public entry point.
 *
 * The active plate is held here rather than inside the figure, because the hero
 * rail reads it out too — the drawing and its measurement are one thing shown
 * in two places, and they must never disagree.
 */
export function LandingPage() {
  const [activePlateId, setActivePlateId] = useState(DEFAULT_PLATE_ID)
  const activePlate = PLATES.find((p) => p.id === activePlateId) ?? PLATES[0]

  if (!activePlate) return null

  return (
    <div className="landing">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <SiteHeader />

      <main id="main" className="landing__main">
        <Hero plate={activePlate} />

        <div className="landing__plate shell">
          <PlateFigure activeId={activePlateId} onSelect={setActivePlateId} />
        </div>

        <Mechanism />
        <Privacy />
        <Entries />
        <Disclosure />
      </main>

      <SiteFooter />
    </div>
  )
}
