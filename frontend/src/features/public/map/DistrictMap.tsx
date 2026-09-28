import 'leaflet/dist/leaflet.css'
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import type { Layer, PathOptions } from 'leaflet'
import { useEffect, useMemo } from 'react'
import { GeoJSON, MapContainer, useMap } from 'react-leaflet'
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
}

/**
 * Sri Lanka's 25 districts, each shaded by its status. Nothing finer than a
 * district is drawn: no report, no facility, no street map beneath. A district
 * with an active published alert is filled and drawn with a heavier outline, so
 * the difference is in the line as well as the colour, and the table beside the
 * map says the same in words.
 */
export function DistrictMap({ districts, selected, onSelect }: DistrictMapProps) {
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
  }

  return (
    <MapContainer
      bounds={[
        [5.85, 79.5],
        [9.9, 81.95],
      ]}
      minZoom={7}
      maxZoom={10}
      maxBounds={[
        [5, 78.8],
        [10.6, 82.6],
      ]}
      attributionControl
      className="h-full w-full bg-paper-sunk"
    >
      <Attribution />
      <GeoJSON key={key} data={DISTRICTS} style={style} onEachFeature={describe} />
    </MapContainer>
  )
}

/** Credit for the outlines, which are OpenStreetMap data republished by geoBoundaries. */
function Attribution() {
  const map = useMap()
  useEffect(() => {
    map.attributionControl.setPrefix(false)
    map.attributionControl.addAttribution(
      'District outlines &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, via <a href="https://www.geoboundaries.org">geoBoundaries</a>',
    )
  }, [map])
  return null
}
