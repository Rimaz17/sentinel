/** South-west and north-east corners, as Leaflet takes them: [[lat, lng], [lat, lng]]. */
export type Bounds = [[number, number], [number, number]]

type Located = { latitude: number | null; longitude: number | null }

/** The whole island, with a little sea around it. */
export const SRI_LANKA: Bounds = [
  [5.85, 79.5],
  [9.9, 81.95],
]

/**
 * The smallest frame holding every located point, or the whole island when
 * there is nothing to frame. A single point, or points on one line, get a
 * minimum span so the map does not zoom in to a single street.
 */
export function boundsOf(points: Located[], minimumSpan = 0.05): Bounds {
  let south = Infinity
  let west = Infinity
  let north = -Infinity
  let east = -Infinity
  for (const { latitude, longitude } of points) {
    if (latitude === null || longitude === null) continue
    south = Math.min(south, latitude)
    north = Math.max(north, latitude)
    west = Math.min(west, longitude)
    east = Math.max(east, longitude)
  }
  if (!Number.isFinite(south)) {
    return SRI_LANKA
  }
  const latPad = Math.max(0, (minimumSpan - (north - south)) / 2)
  const lngPad = Math.max(0, (minimumSpan - (east - west)) / 2)
  return [
    [south - latPad, west - lngPad],
    [north + latPad, east + lngPad],
  ]
}
