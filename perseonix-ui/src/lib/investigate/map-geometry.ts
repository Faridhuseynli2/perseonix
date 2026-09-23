// Projects GeoLite points onto a regional map with a world locator inset.
// Used by the report page and the PDF export. Server-side only in practice:
// world-atlas carries about 1 MB of borders that must stay out of client bundles.
import type { FeatureCollection, Geometry, MultiPoint } from "geojson"
import { geoContains, geoEqualEarth, geoGraticule10, geoMercator, geoPath } from "d3-geo"
import { feature } from "topojson-client"
import type { GeometryCollection, Topology } from "topojson-specification"
import countries50m from "world-atlas/countries-50m.json"
import land110m from "world-atlas/land-110m.json"
import { countryName } from "@/lib/investigate/meta"
import type { GeoLocation } from "@/lib/investigate/types"

type CountryProps = { name: string }

const countriesTopo = countries50m as unknown as Topology<{ countries: GeometryCollection<CountryProps> }>
const landTopo = land110m as unknown as Topology<{ land: GeometryCollection }>
const COUNTRIES = feature(countriesTopo, countriesTopo.objects.countries) as FeatureCollection<Geometry, CountryProps>
const LAND = feature(landTopo, landTopo.objects.land) as FeatureCollection

export const MAP_WIDTH = 760
export const MAP_HEIGHT = 400
const INSET = { x: 12, y: MAP_HEIGHT - 12 - 92, width: 176, height: 92 }

export type MapGeometry = {
  graticule: string
  countries: { d: string; highlighted: boolean }[]
  /** `index` is the point's position in the input, for numbered markers. */
  markers: { point: GeoLocation; index: number; x: number; y: number }[]
  inset: typeof INSET & {
    sphere: string
    land: string
    /** The detail view's outline, projected onto the locator. */
    viewport: [number, number][]
    points: { x: number; y: number }[]
  }
}

export function formatCoordinates({ latitude, longitude }: GeoLocation) {
  const lat = `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? "N" : "S"}`
  const lon = `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? "E" : "W"}`
  return `${lat}, ${lon}`
}

export function placeName(point: GeoLocation) {
  return [point.city, countryName(point.countryCode)].filter(Boolean).join(", ") || "Unknown"
}

/** Mercator view framing every point, never tighter than a regional span. */
function detailProjection(points: GeoLocation[]) {
  const lons = points.map((point) => point.longitude)
  const lats = points.map((point) => point.latitude)
  const minSpan = points.every((point) => point.cityLevel) ? 18 : 34
  const lonPad = Math.max(0, (minSpan - (Math.max(...lons) - Math.min(...lons))) / 2) + 3
  const latPad = Math.max(0, (minSpan / 2 - (Math.max(...lats) - Math.min(...lats))) / 2) + 2
  const frame: MultiPoint = {
    type: "MultiPoint",
    coordinates: [
      [Math.min(...lons) - lonPad, Math.max(-70, Math.min(...lats) - latPad)],
      [Math.max(...lons) + lonPad, Math.min(78, Math.max(...lats) + latPad)],
    ],
  }
  return geoMercator()
    .fitExtent([[0, 0], [MAP_WIDTH, MAP_HEIGHT]], frame)
    .clipExtent([[0, 0], [MAP_WIDTH, MAP_HEIGHT]])
}

export function buildMapGeometry(points: GeoLocation[]): MapGeometry {
  const projection = detailProjection(points)
  const path = geoPath(projection).digits(1)
  const containing = new Set(
    points.flatMap((point) =>
      COUNTRIES.features
        .filter((country) => geoContains(country, [point.longitude, point.latitude]))
        .map((country) => country.properties.name)
    )
  )
  const countries = COUNTRIES.features.flatMap((country) => {
    const d = path(country)
    return d ? [{ d, highlighted: containing.has(country.properties.name) }] : []
  })

  const world = geoEqualEarth().fitExtent(
    [[INSET.x + 6, INSET.y + 6], [INSET.x + INSET.width - 6, INSET.y + INSET.height - 6]],
    { type: "Sphere" }
  )
  const worldPath = geoPath(world).digits(1)
  const viewport = [[0, 0], [MAP_WIDTH, 0], [MAP_WIDTH, MAP_HEIGHT], [0, MAP_HEIGHT]]
    .map((corner) => projection.invert?.(corner as [number, number]))
    .map((lonLat) => (lonLat ? world(lonLat) : null))
    .filter((xy): xy is [number, number] => xy !== null)

  return {
    graticule: path(geoGraticule10()) ?? "",
    countries,
    markers: points.flatMap((point, index) => {
      const xy = projection([point.longitude, point.latitude])
      return xy ? [{ point, index, x: xy[0], y: xy[1] }] : []
    }),
    inset: {
      ...INSET,
      sphere: worldPath({ type: "Sphere" }) ?? "",
      land: worldPath(LAND) ?? "",
      viewport: viewport.length === 4 ? viewport : [],
      points: points.flatMap((point) => {
        const xy = world([point.longitude, point.latitude])
        return xy ? [{ x: xy[0], y: xy[1] }] : []
      }),
    },
  }
}
