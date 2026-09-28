import 'leaflet/dist/leaflet.css'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { Layer, Path, PathOptions } from 'leaflet'
import { useMemo } from 'react'
import { GeoJSON, MapContainer } from 'react-leaflet'
import { cx, labelSm } from '@/styles/recipes'
import type { PublicDistrict } from '../api'
import outlines from './districts.geo.json'

type Outline = { code: string; name: string }

const DISTRICTS = outlines as FeatureCollection<Geometry, Outline>

/** Ink and paper, as literals, because Leaflet's SVG paths cannot read a CSS custom property. */
const INK = '#15222b'
const PAPER = '#eaeeee'
/** The alert red, reserved for the alert vocabulary: here, a district with an active alert. */
const ALERT = '#e0443e'

const USUAL: PathOptions = {
  color: INK,
  weight: 0.75,
  opacity: 0.4,
  fillColor: PAPER,
  fillOpacity: 1,
}
const ELEVATED: PathOptions = {
  color: INK,
  weight: 2,
  opacity: 1,
  fillColor: ALERT,
  fillOpacity: 0.45,
}

type DistrictMapProps = {
  districts: PublicDistrict[]
  selected: string | null
  onSelect: (code: string) => void
  /** Sizes the map; it fills whatever height it is given. */
  className?: string
}

/**
 * Sri Lanka's 25 districts, each shaded by its status. Nothing finer than a
 * district is drawn: no report, no facility, no street map beneath. A district
 * with an active published alert is filled and drawn with a heavier outline, so
 * the difference is in the line as well as the colour.
 *
 * It is a picture, not a tool: it cannot be panned or zoomed, so a thumb or a
 * wheel passing over it scrolls the page, and a district is chosen by clicking
 * it. It is hidden from screen readers and the keyboard, because the district
 * table beside it says the same in words and is where a district is chosen
 * without a mouse.
 */
export function DistrictMap({ districts, selected, onSelect, className }: DistrictMapProps) {
  const byCode = useMemo(() => new Map(districts.map((d) => [d.code, d])), [districts])
  // A new key redraws the layer, so its styles follow the latest figures.
  const key = districts.map((d) => `${d.code}:${d.status}`).join(',') + `|${selected ?? ''}`

  function style(feature?: Feature<Geometry, Outline>): PathOptions {
    const code = feature?.properties.code
    const base = byCode.get(code ?? '')?.status === 'ELEVATED' ? ELEVATED : USUAL
    return code === selected ? { ...base, color: INK, weight: 3, opacity: 1 } : base
  }

  function describe(feature: Feature<Geometry, Outline>, layer: Layer) {
    const district = byCode.get(feature.properties.code)
    const status = district?.status === 'ELEVATED' ? 'elevated activity' : 'usual activity'
    layer.bindTooltip(`${feature.properties.name}: ${status}`, { sticky: true })
    layer.on('click', () => onSelect(feature.properties.code))
    // Leaflet makes each clickable shape a tab stop; the table is the keyboard's way in.
    layer.on('add', () => (layer as Path).getElement()?.setAttribute('tabindex', '-1'))
  }

  return (
    <figure className="m-0 grid gap-2xs">
      {/* isolate: Leaflet's panes sit at z-index 400 and up, and would otherwise
          paint over the sticky site header as the page scrolls past. */}
      <div aria-hidden="true" className={cx('isolate border border-ink-14', className)}>
        <MapContainer
          bounds={[
            [5.9, 79.65],
            [9.85, 81.9],
          ]}
          zoomSnap={0.1}
          zoomControl={false}
          attributionControl={false}
          dragging={false}
          touchZoom={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
          boxZoom={false}
          keyboard={false}
          zoomAnimation={false}
          fadeAnimation={false}
          className="h-full w-full bg-paper-sunk"
        >
          <GeoJSON key={key} data={DISTRICTS} style={style} onEachFeature={describe} />
        </MapContainer>
      </div>
      <figcaption className={cx(labelSm, 'text-ink-70')}>
        District outlines ©{' '}
        <a href="https://www.openstreetmap.org/copyright" className="text-ink-70 underline">
          OpenStreetMap
        </a>{' '}
        contributors, via{' '}
        <a href="https://www.geoboundaries.org" className="text-ink-70 underline">
          geoBoundaries
        </a>
      </figcaption>
    </figure>
  )
}
