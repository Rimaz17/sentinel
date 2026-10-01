import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Facility, LocatedReport } from '../api/types'
import { SYMPTOM_GROUP_STYLES } from '../symptomGroups'
import { type Bounds, SRI_LANKA } from './geometry'
import { facilityLabel, reportLabel } from './labels'
import { type MapRing, ringLabel } from './rings'

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
/** The alert vocabulary, for cluster rings; matches --color-alert. */
const ALERT = '#e0443e'

/** Metres in a degree of latitude, to set a ring's label on its northern edge. */
const METRES_PER_DEGREE = 111_195

type ReportMapProps = {
  reports: LocatedReport[]
  /** The district in view's facilities, drawn as rings; empty on the national view. */
  facilities: Facility[]
  /** Where open alerts' reports are bunched, drawn as dashed alert-red rings. */
  rings: MapRing[]
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
 * view as ink rings; and each cluster the detector found under an open alert
 * as a dashed alert-red ring of its own radius, 2 km, named by its alert's
 * code on its northern edge so the colour never stands alone. This view is
 * for inspectors only. The public dashboard never shows individual reports or
 * clusters.
 */
export function ReportMap({ reports, facilities, rings, bounds, frameKey }: ReportMapProps) {
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

      {/* Under the dots, so every report stays visible inside its ring. */}
      {rings.map((ring) => (
        <Circle
          key={ring.key}
          center={[ring.cluster.latitude, ring.cluster.longitude]}
          radius={ring.cluster.radiusMetres}
          pathOptions={{
            color: ALERT,
            weight: 2,
            dashArray: '6 4',
            fillColor: ALERT,
            fillOpacity: 0.06,
          }}
        >
          <Tooltip sticky>{ringLabel(ring)}</Tooltip>
        </Circle>
      ))}
      {rings.map((ring) => (
        <CircleMarker
          key={`${ring.key}:label`}
          center={[
            ring.cluster.latitude + ring.cluster.radiusMetres / METRES_PER_DEGREE,
            ring.cluster.longitude,
          ]}
          radius={0}
          pathOptions={{ stroke: false, fill: false }}
          interactive={false}
        >
          <Tooltip permanent direction="top" className="font-mono text-label-sm font-medium">
            {ring.alertCode}
          </Tooltip>
        </CircleMarker>
      ))}

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

  // Leaflet measures its container once. Panels loading around the map can
  // resize it afterwards, which would leave tiles missing and the frame off
  // centre, so it measures again whenever the container changes size.
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])

  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 13 })
    // Deliberately keyed to the selection alone: see ReportMapProps.frameKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, frameKey])
  return null
}
