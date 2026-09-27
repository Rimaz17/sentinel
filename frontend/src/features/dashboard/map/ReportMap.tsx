import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import type { Facility, LocatedReport } from '../api/types'
import { SYMPTOM_GROUP_STYLES } from '../symptomGroups'
import { type Bounds, SRI_LANKA } from './geometry'
import { facilityLabel, reportLabel } from './labels'

/*
 * CARTO's light basemap over OpenStreetMap data: free, no API key, no billing.
 * Its near-white ground and grey roads sit under the page's paper and ink
 * without competing with the report dots. Google Maps is not used anywhere in
 * this project; see the README.
 */
const TILES = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

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
      <TileLayer url={TILES} attribution={ATTRIBUTION} subdomains="abcd" maxZoom={20} />
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
