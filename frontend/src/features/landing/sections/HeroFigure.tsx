import { dengueVector } from '@/assets/images'
import { Figure } from '@/components/ui/Figure'
import './hero-figure.css'

/**
 * The full-bleed figure directly below the hero.
 *
 * Dengue is the symptom group the worked example in the specification follows,
 * so the vector is the honest subject for the page's one large image. It is a
 * drawing, not data, and the caption says so.
 */
export function HeroFigure() {
  return (
    <div className="hero-figure">
      <Figure
        className="hero-figure__figure"
        image={dengueVector}
        priority
        sizes="100vw"
        ratio="2.4 / 1"
        alt="A single-line ink drawing of a mosquito — the dengue vector — over a field of topographic contour lines."
        caption="Aedes aegypti, the dengue vector · illustration"
      />
    </div>
  )
}
