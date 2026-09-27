import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Facility, LocatedReport } from '../api/types'
import { SYMPTOM_GROUP_STYLES } from '../symptomGroups'
import { type Bounds, SRI_LANKA } from './geometry'
import { facilityLabel, reportLabel } from './labels'

/*
 * OpenStreetMap's own tiles: free, no API key, no billing, under the OSM Tile
 * Usage Policy, which fits a demonstration's light use. CARTO's basemaps were
 * the first choice, but by September 2026 they stamp "API key required" across
 * every tile requested without a key. Google Maps is not used anywhere in this
 * project; see the README.
 *
 * The standard OSM style is colourful, so the tile layer is drawn in greyscale
 * and let into the paper ground beneath it: roads and coast stay legible, and
 * the only colour on the map is the symptom groups'.
 */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
const TILE_TREATMENT = 'grayscale opacity-60'

/** Ink, for facility rings; matches --color-ink. */
const INK = '#15222b'
/** Paper, for the halo that separates overlapping dots; matches --color-paper. */
const PAPER = '#eaeeee'

type ReportMapProps = {
  reports: LocatedReport[]
  /** The district in view's facilities, drawn as rings; empty on the national view. */
  facilities: Facility[]
  /** Where to frame the map. Reframed only when `frameKey` changes. */
  bounds: Bounds
  /**
   * Identifies what the frame is for, usually the district code. Polling
   * replaces `bounds` every half minute; keying the frame to the selection
   * means an inspector's own panning and zooming is never undone by a refresh.
   */
  frameKey: string
}

/**
 * The internal map: each report at its stored position, rounded to about
 * 100 m at ingestion, coloured by symptom group; facilities in the district in
 * view as ink rings. This view is for inspectors only. The public dashboard
 * never shows individual reports.
 */
export function ReportMap({ reports, facilities, bounds, frameKey }: ReportMapProps) {
  return (
    <MapContainer
      bounds={SRI_LANKA}
      preferCanvas
      minZoom={7}
      maxZoom={18}
      maxBounds={[
        [4.5, 78.5],
        [11, 83],
      ]}
      className="h-full w-full bg-paper-sunk"
    >
      <TileLayer url={TILES} attribution={ATTRIBUTION} maxZoom={19} className={TILE_TREATMENT} />
      <Frame bounds={bounds} frameKey={frameKey} />

      {reports.map((report) => (
        <CircleMarker
          key={report.id}
          center={[report.latitude, report.longitude]}
          radius={4}
          pathOptions={{
            color: PAPER,
            weight: 1,
            fillColor: SYMPTOM_GROUP_STYLES[report.symptomGroup].hue,
            fillOpacity: 0.9,
          }}
        >
          <Tooltip>{reportLabel(report)}</Tooltip>
        </CircleMarker>
      ))}

      {facilities.map((facility) =>
        facility.latitude === null || facility.longitude === null ? null : (
          <CircleMarker
            key={facility.code}
            center={[facility.latitude, facility.longitude]}
            radius={6}
            pathOptions={{ color: INK, weight: 1.5, fill: false }}
          >
            <Tooltip>{facilityLabel(facility)}</Tooltip>
          </CircleMarker>
        ),
      )}
    </MapContainer>
  )
}

function Frame({ bounds, frameKey }: { bounds: Bounds; frameKey: string }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 })
    // Deliberately keyed to the selection alone: see ReportMapProps.frameKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, frameKey])
  return null
}
